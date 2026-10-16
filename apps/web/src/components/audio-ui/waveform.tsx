"use client";

import { Waveform as WaveformPrimitive } from "@audio-ui/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Fades the canvas out at both ends, so bars don't stop on a hard edge. */
const EDGE_FADE =
  "[-webkit-mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] mask-[linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]";

type LiveWaveformShape = NonNullable<WaveformPrimitive.Canvas.Props["variant"]>;
/** A file is drawn from its levels: the raw trace is for live samples. */
type WaveformShape = Exclude<LiveWaveformShape, "scope">;

type WaveformProps = Omit<WaveformPrimitive.Root.Props, "levels" | "peaks"> &
  Pick<
    WaveformPrimitive.Control.Props,
    "getAriaValueText" | "onSelectionChange" | "onSelectionCommitted"
  > & {
    /** How the amplitudes are drawn. */
    shape?: WaveformShape;
    /** The audio's shape, at any resolution: amplitudes (0-1), or `{ min, max }` samples (-1-1) per slice. */
    values: WaveformPrimitive.Root.Peaks;
    variant?: "default" | "playhead";
  };

function Waveform({
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  getAriaValueText,
  onSelectionChange,
  onSelectionCommitted,
  shape,
  values,
  variant = "default",
  ...props
}: WaveformProps) {
  return (
    <WaveformPrimitive.Root
      className="group/waveform w-full min-w-0 data-disabled:cursor-not-allowed"
      peaks={values}
      {...props}
    >
      <WaveformPrimitive.Control
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "relative h-20 w-full min-w-0 cursor-pointer touch-none overflow-hidden rounded-lg py-1 select-none",
          "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          "data-disabled:pointer-events-none data-disabled:opacity-50 data-loading:cursor-progress",
          className,
        )}
        data-slot="waveform"
        getAriaValueText={getAriaValueText}
        onSelectionChange={onSelectionChange}
        onSelectionCommitted={onSelectionCommitted}
      >
        <WaveformPrimitive.Canvas
          className={cn(
            "pointer-events-none block size-full [--waveform-bar-radius:max(0px,min(var(--radius-sm),3px))] [--waveform-color:color-mix(in_oklab,var(--muted-foreground)_50%,transparent)] [--waveform-progress-color:var(--primary)]",
            EDGE_FADE,
          )}
          variant={shape}
        />
        {children}
        {variant === "playhead" ? (
          <>
            <WaveformPrimitive.Playhead className="inset-y-0 w-0.5 -translate-x-1/2 bg-primary group-data-outside/waveform:hidden" />
            <WaveformPrimitive.Thumb className="inset-y-0 my-auto size-3.5 rounded-sm border-2 border-background bg-primary shadow-md group-data-outside/waveform:hidden" />
          </>
        ) : null}
      </WaveformPrimitive.Control>
    </WaveformPrimitive.Root>
  );
}

function WaveformRegion({ className, ...props }: WaveformPrimitive.Region.Props) {
  return (
    <WaveformPrimitive.Region
      className={cn(
        "pointer-events-none inset-y-0 rounded-[min(var(--radius-sm),6px)] bg-primary/15 ring-1 ring-primary/40 ring-inset",
        className,
      )}
      data-slot="waveform-region"
      {...props}
    />
  );
}

function WaveformRegionHandle({ className, ...props }: WaveformPrimitive.RegionHandle.Props) {
  return (
    <WaveformPrimitive.RegionHandle
      className={cn(
        "pointer-events-auto absolute inset-y-0 w-1.5 cursor-ew-resize rounded-[min(var(--radius-sm),6px)] bg-primary/60 has-focus-visible:bg-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50 data-[edge=end]:right-0 data-[edge=start]:left-0",
        "after:absolute after:-inset-x-1.5 after:inset-y-0 pointer-coarse:after:-inset-x-3",
        className,
      )}
      data-slot="waveform-region-handle"
      {...props}
    />
  );
}

function WaveformMarker({ children, className, ...props }: WaveformPrimitive.Marker.Props) {
  return (
    <WaveformPrimitive.Marker
      className={cn("pointer-events-none inset-y-0 w-px bg-foreground/50", className)}
      data-slot="waveform-marker"
      {...props}
    >
      {children ? (
        <span className="absolute top-0 left-1 rounded-[min(var(--radius-sm),6px)] bg-muted px-1 text-[0.625rem] font-medium whitespace-nowrap text-foreground">
          {children}
        </span>
      ) : null}
    </WaveformPrimitive.Marker>
  );
}

type WaveformHoverProps = Omit<WaveformPrimitive.Hover.Props, "children"> & {
  /** Prints the hovered position, e.g. as a time. Left out, only the line shows. */
  format?: (value: number) => string;
};

function WaveformHover({ className, format, ...props }: WaveformHoverProps) {
  const label = format
    ? (value: number) => (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-[min(var(--radius-sm),6px)] bg-foreground px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap text-background tabular-nums">
          {format(value)}
        </span>
      )
    : undefined;
  return (
    <WaveformPrimitive.Hover
      className={cn("pointer-events-none inset-y-0 z-10 w-px bg-foreground/40", className)}
      data-slot="waveform-hover"
      {...props}
    >
      {label}
    </WaveformPrimitive.Hover>
  );
}

type LiveWaveformProps = Omit<ComponentProps<"div">, "children" | "defaultValue"> &
  Pick<WaveformPrimitive.Canvas.Props, "gain" | "idle" | "mirrored" | "mode" | "scrollSpeed"> & {
    /** Shows a sweep while the signal is on its way. */
    loading?: boolean;
    /** How the signal is drawn. `scope` traces raw samples instead of levels. */
    shape?: LiveWaveformShape;
    /** A live signal, such as `useAudioSignal(analyser).level` to scroll, `.bands` to dance or `.samples` for a scope. */
    source?: WaveformPrimitive.Root.Levels | null;
  };

function LiveWaveform({
  className,
  gain,
  idle,
  loading,
  mirrored,
  mode,
  scrollSpeed,
  shape,
  source,
  ...props
}: LiveWaveformProps) {
  return (
    <WaveformPrimitive.Root
      className={cn("relative h-16 w-full min-w-0", className)}
      data-slot="live-waveform"
      levels={source ?? undefined}
      loading={loading}
      role="img"
      {...props}
    >
      <WaveformPrimitive.Canvas
        className={cn(
          "pointer-events-none block size-full [--waveform-bar-radius:max(0px,min(var(--radius-sm),3px))] [--waveform-color:var(--primary)]",
          EDGE_FADE,
        )}
        gain={gain}
        idle={idle}
        mirrored={mirrored}
        mode={mode}
        scrollSpeed={scrollSpeed}
        variant={shape}
      />
    </WaveformPrimitive.Root>
  );
}

type BarVisualizerProps = Omit<ComponentProps<"div">, "children" | "defaultValue"> &
  Pick<WaveformPrimitive.Bars.Props, "count" | "gain" | "idle" | "minLevel" | "mirrored"> & {
    /** Where the bars grow from. */
    align?: "center" | "end" | "start";
    /** Shows a sweep while the signal is on its way. */
    loading?: boolean;
    orientation?: "horizontal" | "vertical";
    /** A live signal, such as `useAudioSignal(analyser).bands`. */
    source?: WaveformPrimitive.Root.Levels | null;
  };

function BarVisualizer({
  align = "center",
  className,
  count,
  gain,
  idle,
  loading,
  minLevel,
  mirrored,
  orientation = "horizontal",
  source,
  ...props
}: BarVisualizerProps) {
  return (
    <WaveformPrimitive.Root
      className={cn(
        "min-h-0 min-w-0 text-primary data-[orientation=horizontal]:h-16 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-16",
        className,
      )}
      data-orientation={orientation}
      data-slot="bar-visualizer"
      levels={source ?? undefined}
      loading={loading}
      role="img"
      {...props}
    >
      <WaveformPrimitive.Bars
        className={cn(
          "flex size-full justify-center gap-0.75",
          orientation === "vertical" && "flex-col",
          align === "start" && "items-start",
          align === "center" && "items-center",
          align === "end" && "items-end",
        )}
        count={count}
        gain={gain}
        idle={idle}
        minLevel={minLevel}
        mirrored={mirrored}
      >
        {(index) => (
          <WaveformPrimitive.Bar
            className={cn(
              "min-h-0 min-w-0 flex-1 rounded-full bg-current",
              orientation === "vertical"
                ? "max-h-1.5 w-[calc(var(--waveform-level)*100%)]"
                : "h-[calc(var(--waveform-level)*100%)] max-w-1.5",
            )}
            index={index}
            key={index}
          />
        )}
      </WaveformPrimitive.Bars>
    </WaveformPrimitive.Root>
  );
}

export {
  BarVisualizer,
  LiveWaveform,
  Waveform,
  WaveformHover,
  WaveformMarker,
  WaveformRegion,
  WaveformRegionHandle,
};
