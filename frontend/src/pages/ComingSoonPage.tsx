import { TopBar } from "../components/layout/TopBar";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { ComingSoon } from "../components/ComingSoon";

interface Props {
  module: "mcps" | "prompts" | "agents";
  displayName: string;
}

export function ComingSoonPage({ module, displayName }: Props) {
  return (
    <>
      <TopBar>
        <Breadcrumb items={[{ label: `${displayName} Hub` }]} />
      </TopBar>
      <div className="flex flex-1 flex-col">
        <ComingSoon module={module} displayName={displayName} />
      </div>
    </>
  );
}
