import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const ScannerComponent = nextDynamic(() => import("./ScannerComponent"), {
  ssr: false,
});

export default function Home() {
  return <ScannerComponent />;
}
