"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type Point = {
  x: number;
  y: number;
};

interface WaveConfig {
  offset: number;
  amplitude: number;
  frequency: number;
  color: string;
  opacity: number;
}

const highlightPills = [
  "AI-Powered ATS",
  "GitHub Analysis",
  "LLM Feedback",
] as const;

const heroStats: { label: string; value: string }[] = [
  { label: "Resumes Analyzed", value: "12k+" },
  { label: "Avg ATS Lift", value: "+34%" },
  { label: "Students Placed", value: "800+" },
];

const reportBreakdown: { label: string; score: number }[] = [
  { label: "Skills Match", score: 91 },
  { label: "Experience Fit", score: 83 },
  { label: "Project Relevance", score: 79 },
  { label: "GitHub Verification", score: 96 },
];

const credibilityMarks = [
  "Used by campus career cells",
  "Built for student recruiters",
  "Secure link verification",
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, staggerChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const statsVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.08 },
  },
};

export function GlowyWavesHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const targetMouseRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let animationId: number;
    let time = 0;

    const computeThemeColors = () => {
      const rootStyles = getComputedStyle(document.documentElement);

      const resolveColor = (variables: string[], alpha = 1) => {
        const tempEl = document.createElement("div");
        tempEl.style.position = "absolute";
        tempEl.style.visibility = "hidden";
        tempEl.style.width = "1px";
        tempEl.style.height = "1px";
        document.body.appendChild(tempEl);

        let color = `rgba(255, 255, 255, ${alpha})`;

        for (const variable of variables) {
          const value = rootStyles.getPropertyValue(variable).trim();
          if (value) {
            tempEl.style.backgroundColor = `var(${variable})`;
            const computedColor = getComputedStyle(tempEl).backgroundColor;

            if (computedColor && computedColor !== "rgba(0, 0, 0, 0)") {
              if (alpha < 1) {
                const rgbMatch = computedColor.match(
                  /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
                );
                if (rgbMatch) {
                  color = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
                } else {
                  color = computedColor;
                }
              } else {
                color = computedColor;
              }
              break;
            }
          }
        }

        document.body.removeChild(tempEl);
        return color;
      };

      return {
        backgroundTop: resolveColor(["--background"], 1),
        backgroundBottom: resolveColor(["--muted", "--background"], 0.95),
        wavePalette: [
          {
            offset: 0,
            amplitude: 70,
            frequency: 0.003,
            color: resolveColor(["--primary"], 0.8),
            opacity: 0.45,
          },
          {
            offset: Math.PI / 2,
            amplitude: 90,
            frequency: 0.0026,
            color: resolveColor(["--accent", "--primary"], 0.7),
            opacity: 0.35,
          },
          {
            offset: Math.PI,
            amplitude: 60,
            frequency: 0.0034,
            color: resolveColor(["--secondary", "--foreground"], 0.65),
            opacity: 0.3,
          },
          {
            offset: Math.PI * 1.5,
            amplitude: 80,
            frequency: 0.0022,
            color: resolveColor(["--primary-foreground", "--foreground"], 0.25),
            opacity: 0.25,
          },
          {
            offset: Math.PI * 2,
            amplitude: 55,
            frequency: 0.004,
            color: resolveColor(["--foreground"], 0.2),
            opacity: 0.2,
          },
        ] satisfies WaveConfig[],
      };
    };

    let themeColors = computeThemeColors();

    const handleThemeMutation = () => {
      themeColors = computeThemeColors();
    };

    const observer = new MutationObserver(handleThemeMutation);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const mouseInfluence = prefersReducedMotion ? 10 : 70;
    const influenceRadius = prefersReducedMotion ? 160 : 320;
    const smoothing = prefersReducedMotion ? 0.04 : 0.1;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const recenterMouse = () => {
      const centerPoint = { x: canvas.width / 2, y: canvas.height / 2 };
      mouseRef.current = centerPoint;
      targetMouseRef.current = centerPoint;
    };

    const handleResize = () => {
      resizeCanvas();
      recenterMouse();
    };

    const handleMouseMove = (event: MouseEvent) => {
      targetMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      recenterMouse();
    };

    resizeCanvas();
    recenterMouse();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const drawWave = (wave: WaveConfig) => {
      ctx.save();
      ctx.beginPath();

      for (let x = 0; x <= canvas.width; x += 4) {
        const dx = x - mouseRef.current.x;
        const dy = canvas.height / 2 - mouseRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - distance / influenceRadius);
        const mouseEffect =
          influence *
          mouseInfluence *
          Math.sin(time * 0.001 + x * 0.01 + wave.offset);

        const y =
          canvas.height / 2 +
          Math.sin(x * wave.frequency + time * 0.002 + wave.offset) *
            wave.amplitude +
          Math.sin(x * wave.frequency * 0.4 + time * 0.003) *
            (wave.amplitude * 0.45) +
          mouseEffect;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = wave.color;
      ctx.globalAlpha = wave.opacity;
      ctx.shadowBlur = 35;
      ctx.shadowColor = wave.color;
      ctx.stroke();

      ctx.restore();
    };

    const animate = () => {
      time += 1;

      mouseRef.current.x +=
        (targetMouseRef.current.x - mouseRef.current.x) * smoothing;
      mouseRef.current.y +=
        (targetMouseRef.current.y - mouseRef.current.y) * smoothing;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, themeColors.backgroundTop);
      gradient.addColorStop(1, themeColors.backgroundBottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      themeColors.wavePalette.forEach(drawWave);

      animationId = window.requestAnimationFrame(animate);
    };

    animationId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      className="relative isolate flex min-h-[86vh] w-full items-center overflow-hidden bg-background"
      role="region"
      aria-label="ResumeAse hero section"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-foreground/[0.035] blur-[140px] dark:bg-foreground/[0.06]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-foreground/[0.025] blur-[120px] dark:bg-foreground/[0.05]" />
        <div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/[0.02] blur-[150px] dark:bg-primary/[0.05]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-14 md:px-8 lg:px-12 lg:py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
        >
          <div className="order-2 lg:order-1">
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground/70 dark:border-border/60 dark:bg-background/70 dark:text-foreground/80"
            >
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              AI-Powered Resume Intelligence
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl lg:text-[3.8rem]"
            >
              Beat the ATS.{" "}
              <span className="bg-gradient-to-r from-primary via-sky-500 to-foreground/80 bg-clip-text text-transparent">
                Land Your Dream Job.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mb-7 max-w-2xl text-base leading-relaxed text-foreground/72 md:text-xl"
            >
              ResumeAse scans your resume, verifies GitHub activity, and uses
              LLM-backed scoring to generate a practical ATS report with clear,
              job-specific actions in seconds.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button
                size="lg"
                className="group gap-2 rounded-full px-8 text-sm uppercase tracking-[0.2em]"
                onClick={() => (window.location.href = "/register")}
              >
                Get Started Free
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-border/40 bg-background/60 px-8 text-sm text-foreground/80 backdrop-blur transition-all hover:border-border/60 hover:bg-background/70 dark:border-border/50 dark:bg-background/40 dark:text-foreground/70 dark:hover:border-border/70 dark:hover:bg-background/50"
                onClick={() => (window.location.href = "/login")}
              >
                Log in
              </Button>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="mb-7 text-xs font-medium uppercase tracking-[0.18em] text-foreground/55"
            >
              No credit card required · Works for PDF and DOCX resumes · Private by default
            </motion.p>

            <motion.ul
              variants={itemVariants}
              className="mb-7 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-foreground/70 dark:text-foreground/80"
            >
              {highlightPills.map((pill) => (
                <li
                  key={pill}
                  className="rounded-full border border-border/40 bg-background/60 px-4 py-2 backdrop-blur dark:border-border/60 dark:bg-background/70"
                >
                  {pill}
                </li>
              ))}
            </motion.ul>

            <motion.ul
              variants={itemVariants}
              className="mb-7 grid gap-2 text-xs text-foreground/70 sm:grid-cols-3"
            >
              {credibilityMarks.map((mark) => (
                <li
                  key={mark}
                  className="rounded-xl border border-border/35 bg-background/60 px-3 py-2 backdrop-blur"
                >
                  {mark}
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={statsVariants}
              className="grid gap-3 rounded-2xl border border-border/35 bg-background/60 p-4 backdrop-blur-sm dark:border-border/60 dark:bg-background/70 sm:grid-cols-3"
            >
              {heroStats.map((stat) => (
                <motion.div key={stat.label} variants={itemVariants} className="space-y-1">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-foreground/50 dark:text-foreground/60">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="order-1 rounded-3xl border border-border/50 bg-background/65 p-4 backdrop-blur-2xl dark:bg-background/60 lg:order-2 lg:p-6"
          >
            <div className="rounded-2xl border border-border/45 bg-background/80 p-4 shadow-[0_25px_70px_rgba(14,116,144,0.22)] dark:bg-background/70">
              <div className="mb-4 flex items-center justify-between border-b border-border/45 pb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/55">
                    ATS Compatibility Report
                  </p>
                  <p className="text-sm font-medium text-foreground/85">
                    Product Designer Resume.pdf
                  </p>
                </div>
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Verified
                </span>
              </div>

              <div className="mb-4 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-blue-500/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/60">
                  Overall Score
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-4xl font-semibold leading-none text-foreground">87</span>
                  <span className="pb-1 text-xs uppercase tracking-[0.2em] text-foreground/55">/100</span>
                </div>
                <p className="mt-2 text-xs text-foreground/65">
                  Strong profile. Improve quantified impact in projects.
                </p>
              </div>

              <div className="space-y-3">
                {reportBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-foreground/65">
                      <span>{item.label}</span>
                      <span className="font-semibold text-foreground/85">{item.score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-border/45 bg-background/75 p-3 text-xs text-foreground/70">
                <p className="mb-1 font-semibold text-foreground/82">Top recommendation</p>
                <p>Add measurable outcomes to your latest project bullets for a faster ATS lift.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
