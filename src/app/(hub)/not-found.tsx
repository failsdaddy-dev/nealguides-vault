import { MessageState, PillLink } from "@/components/states";
import { HOME_PATH } from "@/lib/brand";

export default function HubNotFound() {
  return (
    <MessageState
      title="This page isn’t available"
      body="The link may be wrong, or the item was removed or is outside the filters your account can see."
      action={<PillLink href={HOME_PATH}>Go to the vault</PillLink>}
    />
  );
}
