import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

export default function Home() {
  return (
    <div>
      <h1>LockIntern</h1>
      <Button>
        <Mic />
        Click me
      </Button>
    </div>
  );
}
