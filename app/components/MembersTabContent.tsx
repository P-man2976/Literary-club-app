"use client";

import {
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { Users } from "lucide-react";
import { getUserIconUrl } from "@/app/lib/imageUtils";
import type { MemberProfile } from "@/app/types/post";

type MembersTabContentProps = {
  memberProfiles: MemberProfile[];
  isChromeTheme: boolean;
  isLibraryTheme: boolean;
  aiReadingEnabled: boolean;
  sessionEmail: string | null | undefined;
};

export function MembersTabContent({
  memberProfiles,
  isChromeTheme,
  isLibraryTheme,
  aiReadingEnabled,
  sessionEmail,
}: MembersTabContentProps) {
  return (
    <div className="p-4 space-y-3">
      {memberProfiles.length === 0 ? (
        <Card shadow="sm" className={isChromeTheme
          ? "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none"
          : "border border-default-200 rounded-2xl"
        }>
          <CardBody className="p-6 text-center space-y-2">
            <Users size={28} className="mx-auto text-default-400" />
            <p className="text-sm font-semibold text-default-600">部員プロフィールはまだありません</p>
            <p className="text-xs text-default-400">設定タブでペンネーム・自己紹介を登録すると表示されます。</p>
          </CardBody>
        </Card>
      ) : (
        memberProfiles.map((member) => {
          const iconUrl = getUserIconUrl(member.email, member.userIcon || undefined);
          const fallbackName = member.email ? member.email.split("@")[0] : "匿名部員";
          const displayName = member.penName || fallbackName;
          const displayTags = Array.isArray(member.aiTags) && member.aiTags.length > 0
            ? member.aiTags.slice(0, 3)
            : ["#文芸部", "#創作", "#部員紹介"];

          return (
            <Card key={member.email} shadow="none" className={isChromeTheme
              ? "bg-transparent border-0 border-b border-white/25 rounded-none shadow-none"
              : isLibraryTheme
                ? "jsr-card bg-[#ECE7DB] rounded-2xl"
                : "jsr-card bg-gradient-to-br from-cyan-200 to-blue-300 dark:bg-black rounded-2xl"
            }>
              <CardBody className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={`${displayName}のアイコン`}
                      className="w-20 h-20 rounded-full object-cover border-2 border-black dark:border-white shadow-[0_3px_0_rgba(0,0,0,0.8)]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-yellow-300 border-2 border-black dark:border-white shadow-[0_3px_0_rgba(0,0,0,0.8)]" />
                  )}
                  <p className="font-black text-xl uppercase tracking-wide text-black dark:text-white">{displayName}</p>
                </div>

                <div className={isChromeTheme
                  ? "pt-3 border-t border-white/20"
                  : "rounded-lg bg-white dark:bg-black border-3 border-black dark:border-white p-3"
                }>
                  <p className="text-xs font-black uppercase text-black dark:text-white mb-1">自己紹介</p>
                  <p className="text-sm font-semibold text-black dark:text-white">{member.selfIntro || "未設定"}</p>
                </div>

                {(aiReadingEnabled || member.email !== sessionEmail) && (
                  <div className={isChromeTheme
                    ? "pt-3 border-t border-white/20"
                    : "rounded-lg bg-pink-200 dark:bg-black border-3 border-black dark:border-white p-3"
                  }>
                    <p className="text-xs font-black uppercase text-black dark:text-white mb-1">AI短文分析</p>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {member.aiSummary || "過去投稿ベースのAI分析は準備中です。"}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag, index) => (
                    <Chip key={`${member.email}-${tag}-${index}`} size="md" className="bg-yellow-300 dark:bg-black text-black dark:text-white font-bold border-2 border-black dark:border-white">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
