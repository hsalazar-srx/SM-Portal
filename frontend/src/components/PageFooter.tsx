// src/components/PageFooter.tsx
import { Caption } from '@/components/ui/typography';

interface PageFooterProps {
  /** Page-specific context shown between the company name and the Support link.
   *  Defaults to "Internal Portal". */
  context?: string;
}

export default function PageFooter({ context = 'Internal Portal' }: PageFooterProps) {
  return (
    <footer className="bg-surface border-t border-outline mt-auto w-full px-md lg:px-lg">
      <div className="max-w-7xl mx-auto py-md md:py-lg">
        <Caption className="text-text-weak text-xs md:text-sm">
          © {new Date().getFullYear()} Scanfil APAC • {context} •{' '}
          <a
            href="mailto:itstaff_corp@srxglobal.com"
            className="text-primary hover:text-primary-700 underline ml-sm transition-colors duration-normal"
          >
            Support
          </a>
        </Caption>
      </div>
    </footer>
  );
}
