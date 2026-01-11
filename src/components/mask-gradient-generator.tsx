import * as React from "react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { Highlight, type Language, themes } from "prism-react-renderer"

type MaskStop = {
    id: string
    position: number // 0-100
    opacity: number // 0-100
}

const directionPresets = [
    { value: "to right", label: "To right" },
    { value: "to left", label: "To left" },
    { value: "to bottom", label: "To bottom" },
    { value: "to top", label: "To top" },
    { value: "45deg", label: "45°" },
    { value: "135deg", label: "135°" },
    { value: "custom", label: "Custom angle" },
] as const

type DirectionPreset = (typeof directionPresets)[number]["value"]

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function formatAlpha(opacityPercent: number) {
    const alpha = clampNumber(opacityPercent, 0, 100) / 100
    return Number(alpha.toFixed(3)).toString()
}

function stopToCssColor(opacityPercent: number) {
    const alpha = clampNumber(opacityPercent, 0, 100) / 100

    if (alpha <= 0) return "transparent"
    if (alpha >= 1) return "black"

    // Tailwind-friendly: `rgb(0 0 0 / 0.5)` becomes `rgb(0_0_0_/_0.5)` after escaping.
    return `rgb(0 0 0 / ${Number(alpha.toFixed(3)).toString()})`
}

function buildGradient(direction: string, stops: MaskStop[]) {
    const normalizedStops = [...stops]
        .map((stop) => ({
            ...stop,
            position: clampNumber(stop.position, 0, 100),
            opacity: clampNumber(stop.opacity, 0, 100),
        }))
        .sort((a, b) => a.position - b.position)

    const stopList = normalizedStops
        .map(
            (stop) =>
                `rgba(0,0,0,${formatAlpha(stop.opacity)}) ${stop.position}%`
        )
        .join(", ")

    return `linear-gradient(${direction}, ${stopList})`
}

function buildGradientForTailwindV4(direction: string, stops: MaskStop[]) {
    const normalizedStops = [...stops]
        .map((stop) => ({
            ...stop,
            position: clampNumber(stop.position, 0, 100),
            opacity: clampNumber(stop.opacity, 0, 100),
        }))
        .sort((a, b) => a.position - b.position)

    const stopList = normalizedStops
        .map((stop) => `${stopToCssColor(stop.opacity)} ${stop.position}%`)
        .join(", ")

    return `linear-gradient(${direction}, ${stopList})`
}

function escapeForTailwindArbitraryValue(value: string) {
    // Tailwind arbitrary values are space-sensitive; use underscores for spaces.
    // We keep commas/percent/parentheses as-is.
    return value.replace(/\s+/g, "_")
}

async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        return false
    }
}

function toClassNameSnippet(classNameValue: string) {
    const escaped = classNameValue.replace(/\\/g, "\\\\").replace(/\"/g, '\\"')
    return `<div className="${escaped}" />`
}

function CodeOutput({
    title,
    displayValue,
    copyValue,
    language,
    className,
}: {
    title: string
    displayValue: string
    copyValue: string
    language: Language
    className?: string
}) {
    const [copied, setCopied] = React.useState(false)

    const onCopy = React.useCallback(async () => {
        const ok = await copyToClipboard(copyValue)
        setCopied(ok)
        window.setTimeout(() => setCopied(false), 1200)
    }, [copyValue])

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">{title}</CardTitle>
                <Button className="w-fit" variant="outline" size="sm" onClick={onCopy}>
                    <CopyIcon data-icon="inline-start" />
                    {copied ? "Copied" : "Copy"}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="border-border bg-muted rounded-md border p-3">
                    <Highlight
                        code={displayValue.trimEnd()}
                        language={language}
                        theme={themes.nightOwl}
                    >
                        {({ className: prismClassName, tokens, getLineProps, getTokenProps }) => (
                            <pre
                                className={cn(
                                    "prism-code min-h-28 w-full font-mono text-sm leading-relaxed",
                                    prismClassName
                                )}
                            >
                                {tokens.map((line, i) => (
                                    <div key={i} {...getLineProps({ line })}>
                                        {line.map((token, key) => (
                                            <span key={key} {...getTokenProps({ token })} />
                                        ))}
                                    </div>
                                ))}
                            </pre>
                        )}
                    </Highlight>
                </div>
            </CardContent>
        </Card>
    )
}

export function MaskGradientGenerator() {
    const [directionPreset, setDirectionPreset] = React.useState<DirectionPreset>(
        "to right"
    )
    const [angle, setAngle] = React.useState(90)

    const [stops, setStops] = React.useState<MaskStop[]>(() => [
        { id: crypto.randomUUID(), position: 0, opacity: 100 },
        { id: crypto.randomUUID(), position: 100, opacity: 0 },
    ])

    const direction =
        directionPreset === "custom" ? `${clampNumber(angle, 0, 360)}deg` : directionPreset

    const gradient = React.useMemo(
        () => buildGradient(direction, stops),
        [direction, stops]
    )

    const cssCode = React.useMemo(() => {
        return [
            ".mask {",
            `  -webkit-mask-image: ${gradient};`,
            `  mask-image: ${gradient};`,
            "  -webkit-mask-repeat: no-repeat;",
            "  mask-repeat: no-repeat;",
            "  -webkit-mask-size: 100% 100%;",
            "  mask-size: 100% 100%;",
            "}",
        ].join("\n")
    }, [gradient])

    const tailwindV3Class = React.useMemo(() => {
        const twGradient = escapeForTailwindArbitraryValue(gradient)

        return [
            `[-webkit-mask-image:${twGradient}]`,
            `[mask-image:${twGradient}]`,
            `[-webkit-mask-repeat:no-repeat]`,
            `[mask-repeat:no-repeat]`,
            `[-webkit-mask-size:100%_100%]`,
            `[mask-size:100%_100%]`,
        ].join(" ")
    }, [gradient])

    const tailwindV4Class = React.useMemo(() => {
        const v4Gradient = buildGradientForTailwindV4(direction, stops)
        const twGradient = escapeForTailwindArbitraryValue(v4Gradient)
        return `mask-[${twGradient}]`
    }, [direction, stops])

    const maskStyle = React.useMemo<React.CSSProperties>(() => {
        return {
            WebkitMaskImage: gradient,
            maskImage: gradient,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
        }
    }, [gradient])

    const updateStop = React.useCallback(
        (id: string, patch: Partial<Pick<MaskStop, "position" | "opacity">>) => {
            setStops((prev) =>
                prev.map((stop) =>
                    stop.id === id
                        ? {
                            ...stop,
                            ...(patch.position !== undefined
                                ? { position: clampNumber(patch.position, 0, 100) }
                                : null),
                            ...(patch.opacity !== undefined
                                ? { opacity: clampNumber(patch.opacity, 0, 100) }
                                : null),
                        }
                        : stop
                )
            )
        },
        []
    )

    const addStop = React.useCallback(() => {
        setStops((prev) => {
            if (prev.length >= 6) return prev
            return [...prev, { id: crypto.randomUUID(), position: 50, opacity: 50 }]
        })
    }, [])

    const removeStop = React.useCallback((id: string) => {
        setStops((prev) => {
            if (prev.length <= 2) return prev
            return prev.filter((stop) => stop.id !== id)
        })
    }, [])

    return (
        <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Mask Gradient Generator</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Create linear-gradient mask overlays and copy CSS / Tailwind classnames.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Controls</CardTitle>
                        <CardDescription>
                            Configure gradient direction and mask stops (opacity at each position).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FieldGroup>
                            <Field>
                                <FieldLabel>Direction</FieldLabel>
                                <FieldContent>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Select
                                            value={directionPreset}
                                            onValueChange={(v) => setDirectionPreset(v as DirectionPreset)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select direction" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {directionPresets.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <div className={cn(directionPreset === "custom" ? "" : "opacity-50")}
                                            aria-disabled={directionPreset !== "custom"}
                                        >
                                            <Input
                                                type="number"
                                                inputMode="numeric"
                                                min={0}
                                                max={360}
                                                value={angle}
                                                onChange={(e) => setAngle(Number(e.target.value || 0))}
                                                disabled={directionPreset !== "custom"}
                                                placeholder="Angle (deg)"
                                            />
                                        </div>
                                    </div>
                                </FieldContent>
                            </Field>

                            <Field>
                                <FieldLabel>Stops</FieldLabel>
                                <FieldContent>
                                    <div className="flex flex-col gap-3">
                                        {stops
                                            .slice()
                                            .sort((a, b) => a.position - b.position)
                                            .map((stop) => (
                                                <div
                                                    key={stop.id}
                                                    className="border-border bg-card grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-md border p-3"
                                                >
                                                    <div className="grid gap-1">
                                                        <div className="text-muted-foreground text-xs">Position (%)</div>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={0}
                                                            max={100}
                                                            value={stop.position}
                                                            onChange={(e) =>
                                                                updateStop(stop.id, {
                                                                    position: Number(e.target.value || 0),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <div className="text-muted-foreground text-xs">Opacity (%)</div>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min={0}
                                                            max={100}
                                                            value={stop.opacity}
                                                            onChange={(e) =>
                                                                updateStop(stop.id, {
                                                                    opacity: Number(e.target.value || 0),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => removeStop(stop.id)}
                                                        disabled={stops.length <= 2}
                                                        title={stops.length <= 2 ? "Need at least 2 stops" : "Remove stop"}
                                                    >
                                                        <Trash2Icon />
                                                        <span className="sr-only">Remove stop</span>
                                                    </Button>
                                                </div>
                                            ))}

                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={addStop}
                                                disabled={stops.length >= 6}
                                            >
                                                <PlusIcon data-icon="inline-start" />
                                                Add stop
                                            </Button>
                                            <div className="text-muted-foreground text-xs">
                                                Max 6 stops
                                            </div>
                                        </div>
                                    </div>
                                </FieldContent>
                            </Field>
                        </FieldGroup>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                            <CardDescription>
                                Overlay uses your generated mask gradient.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-border bg-muted relative aspect-video w-full overflow-hidden rounded-md border">
                                <div className="absolute inset-0 bg-card" />
                                <div className="relative flex h-full w-full flex-col justify-end p-6" style={maskStyle}>
                                    <div className="text-lg font-semibold">Your content</div>
                                    <div className="text-muted-foreground text-sm">
                                        The overlay fades according to the mask.
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 flex h-full w-full flex-col items-end justify-start p-6" style={maskStyle}>
                                    <div className="text-lg font-semibold">Your content</div>
                                    <div className="text-muted-foreground text-sm">
                                        The overlay fades according to the mask.
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <CodeOutput
                        title="CSS"
                        displayValue={cssCode}
                        copyValue={cssCode}
                        language="css"
                    />
                    <CodeOutput
                        title="Tailwind v3 classname"
                        displayValue={toClassNameSnippet(tailwindV3Class)}
                        copyValue={tailwindV3Class}
                        language="jsx"
                    />
                    <CodeOutput
                        title="Tailwind v4 classname"
                        displayValue={toClassNameSnippet(tailwindV4Class)}
                        copyValue={tailwindV4Class}
                        language="jsx"
                    />
                </div>
            </div>
        </div>
    )
}
