"use client";

import * as React from "react";

export function MagicCursor() {
  React.useEffect(() => {
    // disable on touch devices
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (coarse) return;

    const el = document.createElement("div");
    el.id = "magic-cursor";
    Object.assign(el.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "20px",
      height: "20px",
      borderRadius: "9999px",
      pointerEvents: "none",
      zIndex: "9999",
      transform: "translate(-50%,-50%)",
      background: "rgba(212,175,55,.5)",
      boxShadow: "0 0 20px rgba(212,175,55,1), 0 0 40px rgba(212,175,55,1)",
      mixBlendMode: "difference",
      transition: "width .2s,height .2s,background .2s,border .2s,box-shadow .2s"
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);

    const move = (e: MouseEvent) => {
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
    };

    const enter = () => {
      document.body.classList.add("hovering");
      el.style.width = "60px";
      el.style.height = "60px";
      el.style.background = "rgba(138,3,3,.2)";
      el.style.border = "2px solid rgba(212,175,55,1)";
      el.style.boxShadow = "0 0 50px rgba(138,3,3,1)";
    };

    const leave = () => {
      document.body.classList.remove("hovering");
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.background = "rgba(212,175,55,.5)";
      el.style.border = "0px solid transparent";
      el.style.boxShadow = "0 0 20px rgba(212,175,55,1), 0 0 40px rgba(212,175,55,1)";
    };

    window.addEventListener("mousemove", move, { passive: true });

    const hoverables = () => Array.from(document.querySelectorAll("a,button,[role='button']")) as HTMLElement[];
    const bind = () => hoverables().forEach(h => {
      h.addEventListener("mouseenter", enter);
      h.addEventListener("mouseleave", leave);
    });
    bind();

    const mo = new MutationObserver(() => bind());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      window.removeEventListener("mousemove", move);
      el.remove();
      document.body.classList.remove("hovering");
    };
  }, []);

  return null;
}
