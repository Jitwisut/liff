"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

// กำหนดโครงสร้างข้อมูล Profile
interface UserProfile {
  displayName: string;
  pictureUrl?: string;
  userId?: string;
}

export default function Home() {
  // --- States ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // --- 1. Init LIFF [ส่วนที่ 1 ของโจทย์] ---
  useEffect(() => {
    let isTerminated = false;
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("ยังไม่ได้ใส่ค่า NEXT_PUBLIC_LIFF_ID");
        }

        // รอจนกว่า liff จะพร้อมทำงาน (ป้องกันการเรียก init ซ้ำใน StrictMode)
        await liff.init({ liffId }).then(() => {
          if (isTerminated) return;
          if (liff.isLoggedIn()) {
            return liff.getProfile().then(userProfile => setProfile(userProfile as UserProfile));
          } else {
            liff.login();
          }
        });
      } catch (err) {
        if (isTerminated) return;
        console.error("LIFF Init Error:", err);
        const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ LINE";
        setErrorMsg(errorMessage);
      } finally {
        if (!isTerminated) {
          setIsLoading(false);
        }
      }
    };

    // Make sure we only call init once or don't let broken state overwrite
    initLiff();
    return () => { isTerminated = true; };
  }, []);

  // --- 2. ฟังก์ชันถาม AI (ต่อ API ส่วนที่ 2) ---
  const askAI = async () => {
    if (!question.trim()) return;
    setIsAsking(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          userId: profile?.userId || ''
        })
      });

      if (!res.ok) {
        throw new Error('Failed to ask AI');
      }

      const data = await res.json();
      setAnswer(data.answer || 'ไม่มีคำตอบจาก AI');

    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการถาม AI");
    } finally {
      setIsAsking(false);
    }
  };

  // --- 3. ฟังก์ชันส่งข้อความกลับเข้า LINE [ส่วนที่ 1 ของโจทย์] ---
  const sendToLine = async () => {
    try {
      if (!liff.isInClient()) {
        alert(
          "ฟังก์ชันนี้ใช้งานได้เมื่อเปิดแอปพลิเคชันผ่านแอป LINE เท่านั้นครับ",
        );
        return;
      }

      await liff.sendMessages([
        {
          type: "text",
          text: `🤖 สรุปผลจาก LINKS AI Assistant\n\nคำถาม: ${question}\nคำตอบ: ${answer}`,
        },
      ]);
      liff.closeWindow(); // ส่งเสร็จแล้วปิดหน้าต่างทันที
    } catch (err) {
      console.error(err);
      alert(
        "ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบ Scopes ว่ามี chat_message.write หรือไม่",
      );
    }
  };

  // --- หน้าจอโหลดข้อมูล ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-blue-600 font-semibold animate-pulse text-lg">
          กำลังโหลดระบบ LINKS AI...
        </p>
      </div>
    );
  }

  // --- หน้าจอ Error (เช่น ลืมใส่ ID หรือ Scopes พัง) ---
  if (errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md border border-red-200 text-center">
          <p className="text-red-500 font-bold mb-2">❌ เกิดข้อผิดพลาด</p>
          <p className="text-gray-700 text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  // --- หน้าจอหลัก (Main UI) ---
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {/* Header & Profile Section */}
        <div className="bg-blue-600 p-6 text-white text-center">
          {profile ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={profile.pictureUrl || "https://via.placeholder.com/150"}
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
                alt="profile"
              />
              <h1 className="text-xl font-bold">
                สวัสดี, {profile.displayName}
              </h1>
              <p className="text-blue-100 text-sm">
                LINKS AI Assistant ยินดีให้บริการ
              </p>
            </div>
          ) : (
            <p>กรุณาเข้าสู่ระบบผ่าน LINE</p>
          )}
        </div>

        {/* Input Form Section */}
        <div className="p-6 space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            ถามคำถามเกี่ยวกับบริการ LINKS
          </label>
          <textarea
            className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="พิมพ์คำถามของคุณที่นี่..."
          />
          <button
            onClick={askAI}
            disabled={isAsking || !question}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${isAsking || !question
                ? "bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {isAsking ? "กำลังประมวลผล..." : "ถาม AI"}
          </button>
        </div>

        {/* AI Answer Section */}
        {answer && (
          <div className="p-6 bg-blue-50 border-t border-blue-100">
            <h2 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
              <span>🤖</span> คำตอบจาก AI:
            </h2>
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-gray-700 whitespace-pre-wrap shadow-sm text-sm leading-relaxed">
              {answer}
            </div>

            {/* ปุ่มส่งกลับ LINE */}
            <button
              onClick={sendToLine}
              className="mt-4 w-full border-2 border-green-500 text-green-600 py-2 rounded-xl font-bold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>📩</span> ส่งสรุปเข้า LINE Chat
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-gray-400 text-xs mt-6">
        © LINKS Platform Live Coding Test
      </p>
    </div>
  );
}
