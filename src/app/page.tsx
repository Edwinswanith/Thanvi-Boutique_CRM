import { permanentRedirect } from "next/navigation";

/** The domain root is the shop (what search engines and AI assistants index). Staff use /admin. */
export default function Home() {
  permanentRedirect("/shop");
}
