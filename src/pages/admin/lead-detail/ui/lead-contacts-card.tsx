import { Mail, Pencil, Phone, Plus, Star, Trash2 } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { LeadContact } from "../api/lead-detail";

interface LeadContactsCardProps {
  contacts: Array<LeadContact>;
  onAdd: () => void;
  onEdit: (contact: LeadContact) => void;
  onDelete: (contact: LeadContact) => void;
  onMakePrimary: (contact: LeadContact) => void;
  isMakingPrimary: boolean;
}

export function LeadContactsCard({
  contacts,
  onAdd,
  onEdit,
  onDelete,
  onMakePrimary,
  isMakingPrimary,
}: LeadContactsCardProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button intent="utility" leadingIcon={<Plus size={13} />} onClick={onAdd}>
          Add
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        {contacts.length === 0 ? (
          <p className="text-xs text-[var(--color-text-faint)]">No contacts recorded.</p>
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.publicId} className="flex items-start gap-3">
                <Avatar size="sm" alt={contact.name ?? "?"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-medium text-[var(--color-text)]">
                      {contact.name ?? "-"}
                    </p>
                    {contact.isPrimary && <Badge variant="primary">Primary</Badge>}
                  </div>
                  {contact.jobTitle && (
                    <p className="text-xs text-[var(--color-text-muted)]">{contact.jobTitle}</p>
                  )}
                  {contact.email && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Phone size={11} className="shrink-0" />
                      {contact.phone}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {!contact.isPrimary && (
                      <Button
                        intent="utility"
                        leadingIcon={<Star size={12} />}
                        disabled={isMakingPrimary}
                        isLoading={isMakingPrimary}
                        onClick={() => onMakePrimary(contact)}
                      >
                        Make primary
                      </Button>
                    )}
                    <Button
                      intent="utility"
                      leadingIcon={<Pencil size={12} />}
                      onClick={() => onEdit(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      intent="utility"
                      className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                      leadingIcon={<Trash2 size={12} />}
                      onClick={() => onDelete(contact)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
