"use client";

import { FormEvent, useRef, useState } from "react";
import { gsap, useGSAP, SplitText, prefersReducedMotion } from "@/lib/motion";

type Status = "idle" | "sending" | "done" | "error";

export function Waitlist() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const ring = useRef<SVGEllipseElement>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  useGSAP(
    () => {
      if (prefersReducedMotion() || !title.current) return;
      if (ring.current) {
        gsap.from(ring.current, {
          drawSVG: 0,
          duration: 1.55,
          ease: "into",
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        });
      }

      SplitText.create(title.current, {
        type: "chars",
        mask: "chars",
        charsClass: "cine-char",
        onSplit(self) {
          return gsap.from(self.chars, {
            yPercent: 120,
            autoAlpha: 0,
            stagger: 0.045,
            duration: 1.2,
            ease: "silk",
            scrollTrigger: { trigger: title.current, start: "top 86%", once: true },
          });
        },
      });

      gsap.from(".invite-fade", {
        autoAlpha: 0,
        y: 18,
        filter: "blur(6px)",
        stagger: 0.12,
        duration: 1.1,
        ease: "silk",
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending" || status === "done") return;
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "The house could not take the name.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("The line was cut. Try once more.");
    }
  };

  return (
    <section
      id="invitation"
      ref={root}
      className="emp-band relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 md:px-12"
    >
      <p className="invite-fade text-[10px] uppercase tracking-[0.5em] text-[#A8845C]">
        Private list
      </p>
      <div className="relative mt-6">
        <svg className="invite-ring" viewBox="0 0 420 140" fill="none" aria-hidden>
          <ellipse ref={ring} cx="210" cy="70" rx="186" ry="52" stroke="#A8845C" strokeWidth="0.6" />
        </svg>
        <h2
          ref={title}
          className="font-display cine-title relative text-[clamp(2.4rem,7.2vw,5.8rem)] font-medium italic tracking-[0.08em] text-[#E8DCC8]"
        >
          Request
        </h2>
      </div>
      <p className="invite-fade mx-auto mt-7 max-w-sm text-center text-sm leading-relaxed tracking-[0.05em] text-[#8A7A6E]">
        The list is not public. Leave a name. If it is time, the house will find you.
      </p>

      {status === "done" ? (
        <p className="font-display mt-14 text-2xl italic text-[#E8DCC8]">The house has your name.</p>
      ) : (
        <form onSubmit={onSubmit} className="invite-fade mt-12 w-full max-w-md text-left">
          <label htmlFor="correspondence" className="sr-only">
            Email
          </label>
          <input
            id="correspondence"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="your correspondence"
            className="invitation-input"
          />
          <div className="flex justify-center">
            <button type="submit" className="invitation-submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending" : "Request an invitation"}
            </button>
          </div>
          {message ? (
            <p className="mt-5 text-center text-xs tracking-wide text-[#A8845C]">{message}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
