import { Suspense } from "react";
import { InvitationsManagement } from "./InvitationsManagement";

export default function InvitationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">編集者招待管理</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <InvitationsManagement />
      </Suspense>
    </div>
  );
}
