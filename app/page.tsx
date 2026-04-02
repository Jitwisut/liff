"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

// กำหนดโครงสร้างข้อมูล Profile
interface UserProfile {
  displayName: string;
  pictureUrl?: string;
}

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");

  useEffect(() => {
    liff
      .init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
      .then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then((p) => setProfile(p as UserProfile));
        } else {
          liff.login();
        }
      })
      .catch((err: Error) => console.error(err));
  }, []);

  const askAI = async () => {
    // โค้ดเรียก API Backend [โจทย์ส่วนที่ 2]
  };

  const sendToLine = async () => {
    try {
      await liff.sendMessages([{ type: "text", text: `สรุปคำตอบ: ${answer}` }]);
      liff.closeWindow();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      {profile && (
        <div className="flex items-center gap-2 mb-4">
          <img
            src={profile.pictureUrl}
            className="w-10 h-10 rounded-full"
            alt="profile"
          />
          <p>สวัสดี, {profile.displayName}</p>
        </div>
      )}

      <textarea
        className="w-full border p-2 rounded mb-2 text-black"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="ถาม AI เกี่ยวกับ LINKS..."
      />
      <button
        onClick={askAI}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full mb-2"
      >
        ถาม AI
      </button>

      {answer && (
        <div className="mt-4 border-t pt-4">
          <p className="whitespace-pre-wrap text-gray-800">{answer}</p>
          <button
            onClick={sendToLine}
            className="bg-green-500 text-white px-4 py-2 rounded w-full mt-2"
          >
            ส่งสรุปเข้า LINE
          </button>
        </div>
      )}
    </div>
  );
}
