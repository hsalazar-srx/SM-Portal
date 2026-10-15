// src/components/ReportHelpDrawer.tsx
// Uses skill: architecture/ui-ux-best-practices
// "How to read this report" — renders whatever help the Reporting-Service catalog declares for a
// report, so a new report's help needs no portal change.
import { useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { H3, Caption } from '@/components/ui/typography';
import { SUPPORT_EMAIL } from '@/lib/support';
import type { ReportDefinition, ReportHelpSection } from '@/services/reportService';

function HelpSection({ section }: { section: ReportHelpSection }) {
  return (
    <section className="space-y-sm">
      <H3 className="text-base">{section.title}</H3>

      {section.text && <p className="text-sm text-text">{section.text}</p>}

      {section.items.length > 0 && (
        <dl className="divide-y divide-outline rounded-md border border-outline">
          {section.items.map(item => (
            <div key={item.term} className="px-md py-sm">
              <dt className="text-sm font-medium text-text">{item.term}</dt>
              <dd className="mt-xs text-sm text-text-weak">{item.text}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.bullets.length > 0 && (
        <ul className="list-disc space-y-xs pl-lg text-sm text-text-weak">
          {section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
        </ul>
      )}
    </section>
  );
}

export default function ReportHelpDrawer({
  report, isOpen, onClose,
}: {
  report: ReportDefinition;
  isOpen: boolean;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  // Keyboard: Esc closes; focus moves into the panel so a screen reader announces it.
  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const sections = report.help?.sections ?? [];
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Report help: ${report.displayName}`)}`;

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={open => { if (!open) onClose(); }}
      side="right"
      className="w-full sm:w-[30rem]"
      role="dialog"
      aria-modal="true"
      aria-label={`How to read ${report.displayName}`}
      aria-hidden={!isOpen}
    >
      {/* Content is mounted only while open, so nothing off-screen can take keyboard focus. */}
      {isOpen && (
        <DrawerContent className="flex flex-col">
          <DrawerHeader>
            <div className="flex items-start justify-between gap-md">
              <div>
                <Caption className="uppercase tracking-wide">How to read this report</Caption>
                <h2 className="text-lg font-semibold text-text">{report.displayName}</h2>
              </div>
              <Button ref={closeButton} variant="tertiary" size="sm" onClick={onClose} aria-label="Close help">
                Close
              </Button>
            </div>
          </DrawerHeader>

          <DrawerBody className="flex-1 space-y-lg overflow-y-auto">
            {sections.map(section => <HelpSection key={section.title} section={section} />)}
          </DrawerBody>

          <DrawerFooter>
            <p className="text-sm text-text">Questions, or a number that looks wrong?</p>
            <a href={mailto} className="text-sm text-primary underline hover:text-primary-700">
              Contact IT support
            </a>
          </DrawerFooter>
        </DrawerContent>
      )}
    </Drawer>
  );
}
