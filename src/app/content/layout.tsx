import Workspace from "@/components/Workspace";

/** Every page in this area sits inside the signed-in person's own workspace menu. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Workspace>{children}</Workspace>;
}
