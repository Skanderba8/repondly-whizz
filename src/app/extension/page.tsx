import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { WorkspacePanel } from "@/components/workspace-panel";
import { Button } from "@/components/ui/button";
import { getChromeWebStoreUrl } from "@/lib/chrome-extension";

export const metadata: Metadata = { title: "Chrome extension" };

export default function ExtensionPage() {
  const storeUrl = getChromeWebStoreUrl();
  return <>
    <PageHeading title="Whizz for Chrome" description="Reviews and DoorDash entry, one click from your browser toolbar." />
    <WorkspacePanel id="extension-install" title={storeUrl ? "Add the extension" : "Team installation is coming"}>
      <div className="flex max-w-xl flex-col gap-5 px-4 pb-5 md:px-6">
        {storeUrl ? <>
          <p className="text-sm text-muted-foreground">Install Whizz on desktop Chrome using the Chrome Web Store. Keep using your existing work account.</p>
          <Button asChild className="w-fit"><a href={storeUrl} target="_blank" rel="noopener noreferrer">Add to Chrome<ArrowUpRight aria-hidden="true" /></a></Button>
          <ol className="list-decimal space-y-3 pl-5 text-sm"><li>Choose Add to Chrome in the store and confirm Add extension.</li><li>Open Chrome's Extensions menu and pin Whizz Repondly.</li><li>Click the Whizz icon and log in with your work email and password.</li></ol>
        </> : <p className="text-sm text-muted-foreground">Whizz is being prepared for the Chrome Web Store. Once it is available, Add extension in your sidebar will take you straight to installation. You can keep using the app while you wait.</p>}
        <p className="text-xs text-muted-foreground">The extension has its own sign-in session. Your records and bonuses use the same Whizz account.</p>
        <Link href="/extension/privacy/" className="w-fit text-sm text-link underline underline-offset-4">Extension privacy</Link>
      </div>
    </WorkspacePanel>
  </>;
}
