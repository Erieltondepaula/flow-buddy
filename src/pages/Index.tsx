import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import KnowledgeBase from "@/components/KnowledgeBase";
import CommonErrors from "@/components/CommonErrors";
import SolutionHistory from "@/components/SolutionHistory";

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return <ChatPanel />;
      case "knowledge":
        return <KnowledgeBase />;
      case "errors":
        return <CommonErrors />;
      case "history":
        return <SolutionHistory />;
      default:
        return <ChatPanel />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 ml-72 h-screen overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
