"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";

interface Visitor {
  ip: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
}

function decode(value: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function countryName(code: string) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Cloudflare 的 cf.city 是英文城市名，常见城市转成中文，其余原样显示
const CITY_NAMES: Record<string, string> = {
  Beijing: "北京",
  Shanghai: "上海",
  Guangzhou: "广州",
  Shenzhen: "深圳",
  Hangzhou: "杭州",
  Nanjing: "南京",
  Suzhou: "苏州",
  Chengdu: "成都",
  Wuhan: "武汉",
  "Xi'an": "西安",
  Tianjin: "天津",
  Chongqing: "重庆",
  Qingdao: "青岛",
  Xiamen: "厦门",
  Changsha: "长沙",
  Zhengzhou: "郑州",
  Jinan: "济南",
  Hefei: "合肥",
  Fuzhou: "福州",
  Kunming: "昆明",
  Dalian: "大连",
  Shenyang: "沈阳",
  Harbin: "哈尔滨",
  Changchun: "长春",
  Shijiazhuang: "石家庄",
  Taiyuan: "太原",
  Nanchang: "南昌",
  Guiyang: "贵阳",
  Nanning: "南宁",
  Haikou: "海口",
  Lanzhou: "兰州",
  Urumqi: "乌鲁木齐",
  Hohhot: "呼和浩特",
  Yinchuan: "银川",
  Xining: "西宁",
  Lhasa: "拉萨",
};

function cityName(name: string) {
  return CITY_NAMES[name] ?? name;
}

/**
 * 首页欢迎卡片：按 Cloudflare 提供的访客 IP / 城市生成问候语。
 * 定位失败或本地预览时自动降级，不阻塞首屏渲染。
 */
export function VisitorGreeting({ email }: { email: string }) {
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/visitor", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("visitor"))))
      .then((data) => {
        if (alive) setVisitor(data as Visitor);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const ip = visitor?.ip ?? "";
  const local =
    /^(::1|127\.|::ffff:127\.)/.test(ip) || (visitor !== null && ip === "");
  const rawCity = decode(visitor?.city ?? "");
  const city = cityName(rawCity);
  const region = decode(visitor?.region ?? "");
  const country = countryName(decode(visitor?.country ?? ""));
  const place = local ? "本地" : city || region || country || "";
  // 城市已转成中文时不再混排英文州省名，避免“南京 · Jiangsu · 中国”
  const showRegion = rawCity && CITY_NAMES[rawCity] ? "" : region !== place ? region : "";
  const detail = local ? "" : [place, showRegion, country].filter(Boolean).join(" · ");

  return (
    <>
      <span className="eyebrow">
        <span className="eyebrow-dot" />
        Welcome
      </span>
      <h2 className="section-title mt-2">
        {place ? `来自${place}的小伙伴，你好` : "你好，远道而来的小伙伴"}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        欢迎来 Zag 的数字花园坐坐。这里写代码、记想法，也放照片和循环播放的歌。
        <br />
        {failed
          ? "没能识别你的位置，但你能来就是最好的定位。"
          : "希望你在这一屏玻璃与光里，找到一点喜欢的东西。"}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--glass-soft)] px-3 py-2 font-mono text-[0.68rem] text-muted">
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-3)]" />
        <span className="truncate">
          {!visitor
            ? "正在识别你的位置…"
            : local
              ? "本地预览 · 未获取公网 IP"
              : `IP ${ip || "未知"}${detail ? ` · ${detail}` : ""}`}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/about" className="btn btn-primary">
          认识我
          <Icon name="arrow-right" size={15} />
        </Link>
        <a href={`mailto:${email}`} className="btn">
          <Icon name="mail" size={15} />
          写邮件
        </a>
      </div>
    </>
  );
}