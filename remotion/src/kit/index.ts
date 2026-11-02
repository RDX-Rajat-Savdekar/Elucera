// The ONLY module LLM-written scenes may import besides react/remotion (and three for 3D).
export { theme, STATES } from "../theme";
export type { State } from "../theme";
export { ramp, sec, useSpringAt, ease, mix, useTimeline } from "./anim";

// ── originals ──
export { Appear } from "./Appear";
export { Title } from "./Title";
export { Highlight } from "./Highlight";
export { CodeBlock } from "./CodeBlock";
export { ArrayBars } from "./ArrayBars";
export type { ArrayStep as ArrayBarsStep } from "./ArrayBars";
export { NodeGraph } from "./NodeGraph";
export type { GNode, GEdge, Packet } from "./NodeGraph";
export { Scene3D } from "./Scene3D";
export { Molecule3D } from "./Molecule3D";
export type { Atom } from "./Molecule3D";

// ── general kit ──
export { Stage, Slot, LAYOUT } from "./general/Stage";
export { Icon, IconRow, ICON_NAMES } from "./general/Icon";
export type { IconName } from "./general/Icon";
export { Arrow, Callout, Pill, Counter, Progress, Typewriter, Pulse, Cut } from "./general/Motion";
export { Mark, Headline, StepList, Split, Timeline, BarChart, Terminal } from "./general/Blocks";

// ── DSA / LeetCode kit ──
export { ArrayView, StringView, BitRow } from "./dsa/ArrayView";
export type { ArrayStep } from "./dsa/ArrayView";
export { Grid, LinkedList, SeqView, HashMapView } from "./dsa/Structures";
export type { GridStep, ListStep, SeqStep, MapStep } from "./dsa/Structures";
export { BinaryTree, RecursionTree, Trie, Heap, Graph, parseLevelOrder } from "./dsa/Trees";
export type { TreeStep, GraphStep, GraphNode, GraphEdge, NestedNode } from "./dsa/Trees";
export { CodePanel, VarWatch, ProblemCard, Complexity, ComplexityChart, Intervals } from "./dsa/Panels";
export type { CodeStep, VarStep, IntervalStep, BigO } from "./dsa/Panels";

// ── official Remotion helpers, re-exported so scenes keep a single import ──
export { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
export { fade } from "@remotion/transitions/fade";
export { slide } from "@remotion/transitions/slide";
export { wipe } from "@remotion/transitions/wipe";
export { evolvePath } from "@remotion/paths";
export { Pie, Star, Triangle, Polygon } from "@remotion/shapes";
export { noise2D } from "@remotion/noise";
