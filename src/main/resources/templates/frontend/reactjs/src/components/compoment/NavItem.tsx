import React from "react";

type NavItemProps = {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
};

export default function NavItem({ icon, active = false, onClick, title }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        "w-full h-12 flex items-center justify-center rounded-xl transition",
        active ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-100",
      ].join(" ")}
    >
      <span className={active ? "scale-105" : ""}>{icon}</span>
    </button>
  );
}
