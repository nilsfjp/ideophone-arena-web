// Authored preview — the real shadcn Tabs from window.IdeophoneArena, themed to
// the app's segmented-control look (auth tabs, completion tabs): a bordered
// washi container with an ink-filled active trigger. defaultValue renders the
// active tab statically.
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "ideophone-arena-web";

const panel: React.CSSProperties = {
  padding: "var(--space-3) 0",
  color: "var(--ink-muted)",
  fontSize: "var(--text-sm)",
};

// The auth segmented control: Sign in / Register, with the first tab active.
export const AuthTabs = () => (
  <div style={{ padding: "var(--space-4)", maxWidth: 380 }}>
    <Tabs defaultValue="signin">
      <TabsList>
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <p style={panel}>Welcome back — sign in to keep your lab record.</p>
      </TabsContent>
      <TabsContent value="register">
        <p style={panel}>Pick a display name to join the arena.</p>
      </TabsContent>
    </Tabs>
  </div>
);
