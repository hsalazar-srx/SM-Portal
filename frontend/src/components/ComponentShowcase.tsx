// src/components/ComponentShowcase.tsx
// Displays all UI components with examples
import { useState } from 'react';
import ResponsiveHeader from '@/components/ResponsiveHeader';
import { Card, CardHeaderStrip, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Badge, BadgeGroup } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Spinner, LoadingState, Skeleton } from '@/components/ui/spinner';
import { StatsGrid } from '@/components/ui/stats';
import { H2, Body, Caption } from '@/components/ui/typography';

export default function ComponentShowcase() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState('option1');
  const [badges, setBadges] = useState([
    { id: '1', label: 'React', icon: '⚛️', variant: 'primary' as const },
    { id: '2', label: 'TypeScript', icon: '📘', variant: 'primary' as const },
    { id: '3', label: 'Tailwind', icon: '🎨', variant: 'info' as const },
  ]);

  const handleSimulateLoad = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleRemoveBadge = (id: string) => {
    setBadges(badges.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Component Showcase"
        subtitle="Interactive UI Component Library"
        showComponentsLink={true}
      />

      <div className="flex-1 w-full px-md lg:px-lg py-md md:py-lg">
        <div className="max-w-7xl mx-auto space-y-xl">
        {/* Header */}
        <div className="space-y-md">
          <H2>Component Showcase</H2>
          <Body className="text-text-weak">
            A comprehensive collection of polished, accessible UI components built with Tailwind CSS and design tokens.
          </Body>
        </div>

        {/* Tabs for different component categories */}
        <Tabs defaultValue="inputs">
          <TabsList>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="loading">Loading</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          {/* INPUTS SECTION */}
          <TabsContent value="inputs">
            <div className="grid gap-lg md:grid-cols-2">
              {/* Input Examples */}
              <Card>
                <CardHeaderStrip title="Text Inputs" />
                <CardBody className="space-y-md">
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    helperText="Enter your complete name"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@example.com"
                    error="Invalid email format"
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    disabled
                    helperText="Disabled input"
                  />
                </CardBody>
              </Card>

              {/* Select & Textarea */}
              <Card>
                <CardHeaderStrip title="Select & Textarea" />
                <CardBody className="space-y-md">
                  <Select
                    label="Choose Option"
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    helperText="Select one from the list"
                    options={[
                      { value: 'option1', label: 'Option 1' },
                      { value: 'option2', label: 'Option 2' },
                      { value: 'option3', label: 'Option 3' },
                    ]}
                  />
                  <Textarea
                    label="Comments"
                    placeholder="Enter your comments here..."
                    helperText="Maximum 500 characters"
                  />
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          {/* BADGES SECTION */}
          <TabsContent value="badges">
            <div className="space-y-lg">
              {/* Badge Variants */}
              <Card>
                <CardHeaderStrip title="Badge Variants" />
                <CardBody className="space-y-md">
                  <div className="space-y-sm">
                    <Caption className="font-semibold">Primary</Caption>
                    <div className="flex flex-wrap gap-sm">
                      <Badge>Default</Badge>
                      <Badge icon="📦">With Icon</Badge>
                      <Badge onRemove={() => {}}>Removable</Badge>
                    </div>
                  </div>

                  <div className="space-y-sm">
                    <Caption className="font-semibold">Status Variants</Caption>
                    <div className="flex flex-wrap gap-sm">
                      <Badge variant="success" icon="✓">Success</Badge>
                      <Badge variant="warning" icon="⚠️">Warning</Badge>
                      <Badge variant="error" icon="✕">Error</Badge>
                      <Badge variant="info" icon="ℹ️">Info</Badge>
                    </div>
                  </div>

                  <div className="space-y-sm">
                    <Caption className="font-semibold">Sizes</Caption>
                    <div className="flex flex-wrap gap-sm items-center">
                      <Badge size="sm">Small</Badge>
                      <Badge size="md">Medium</Badge>
                      <Badge size="lg">Large</Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Badge Group */}
              <Card>
                <CardHeaderStrip title="Badge Groups" />
                <CardBody className="space-y-md">
                  <div className="space-y-sm">
                    <Caption className="font-semibold">Tech Stack (Removable)</Caption>
                    <BadgeGroup items={badges} onRemove={handleRemoveBadge} />
                  </div>

                  <div className="space-y-sm">
                    <Caption className="font-semibold">Permissions (Limited)</Caption>
                    <BadgeGroup
                      items={[
                        { id: '1', label: 'view:invoices' },
                        { id: '2', label: 'edit:invoices' },
                        { id: '3', label: 'delete:invoices' },
                        { id: '4', label: 'view:reports' },
                        { id: '5', label: 'export:data' },
                      ]}
                      limit={3}
                    />
                  </div>
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          {/* LOADING SECTION */}
          <TabsContent value="loading">
            <div className="grid gap-lg md:grid-cols-2">
              {/* Spinner */}
              <Card>
                <CardHeaderStrip title="Spinners" />
                <CardBody className="space-y-lg">
                  <div className="space-y-md">
                    <Caption className="font-semibold">Sizes</Caption>
                    <div className="flex gap-lg items-center py-md">
                      <Spinner size="sm" />
                      <Spinner size="md" />
                      <Spinner size="lg" />
                    </div>
                  </div>

                  <div className="space-y-md">
                    <Caption className="font-semibold">Variants</Caption>
                    <div className="flex gap-lg items-center py-md">
                      <Spinner variant="primary" />
                      <Spinner variant="accent" />
                      <Spinner variant="subtle" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Loading States */}
              <Card>
                <CardHeaderStrip title="Loading States" />
                <CardBody className="space-y-md">
                  <LoadingState isLoading={isLoading} message="Processing your request..." />
                  {!isLoading && (
                    <Button onClick={handleSimulateLoad} className="w-full">
                      Simulate Loading (2s)
                    </Button>
                  )}
                  
                  <div className="pt-md border-t border-outline space-y-md">
                    <Caption className="font-semibold">Skeleton Loader</Caption>
                    <Skeleton count={3} />
                  </div>
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          {/* STATS SECTION */}
          <TabsContent value="stats">
            <div className="space-y-lg">
              <Card>
                <CardHeaderStrip title="Stats Cards - Overview" />
                <CardBody>
                  <StatsGrid
                    stats={[
                      {
                        label: 'Total Transactions',
                        value: '1,234',
                        icon: '📊',
                        color: 'primary',
                        trend: { direction: 'up', value: '+12% this month' },
                      },
                      {
                        label: 'Success Rate',
                        value: '98.5%',
                        icon: '✓',
                        color: 'success',
                        trend: { direction: 'up', value: '+2.1% from last month' },
                      },
                      {
                        label: 'Active Users',
                        value: '456',
                        icon: '👥',
                        color: 'info',
                        trend: { direction: 'up', value: '+28 users this week' },
                      },
                      {
                        label: 'API Errors',
                        value: '12',
                        icon: '⚠️',
                        color: 'warning',
                        trend: { direction: 'down', value: '-3 errors from yesterday' },
                      },
                    ]}
                    columns={4}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeaderStrip title="Stats Cards - Audit Metrics" />
                <CardBody>
                  <StatsGrid
                    stats={[
                      {
                        label: 'Audit Logs',
                        value: '45,891',
                        icon: '📋',
                        color: 'primary',
                      },
                      {
                        label: 'Compliance Score',
                        value: '99.2%',
                        icon: '🔒',
                        color: 'success',
                      },
                      {
                        label: 'Failed Attempts',
                        value: '8',
                        icon: '🚫',
                        color: 'error',
                      },
                    ]}
                    columns={3}
                  />
                </CardBody>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Buttons Section */}
        <Card>
          <CardHeaderStrip title="Button Variants" />
          <CardBody>
            <div className="space-y-md">
              <div className="space-y-sm">
                <Caption className="font-semibold">Primary & Secondary</Caption>
                <div className="flex flex-wrap gap-sm">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="tertiary">Tertiary</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>

              <div className="space-y-sm">
                <Caption className="font-semibold">States</Caption>
                <div className="flex flex-wrap gap-sm">
                  <Button disabled>Disabled</Button>
                  <Button onClick={handleSimulateLoad}>{isLoading ? 'Loading...' : 'Click Me'}</Button>
                </div>
              </div>

              <div className="space-y-sm">
                <Caption className="font-semibold">Full Width</Caption>
                <Button className="w-full">Full Width Button</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-sm py-md md:py-lg border-t border-outline mt-xl">
          <Caption className="text-text-weak text-xs">
            Built with TypeScript, React, Tailwind CSS, and semantic design tokens
          </Caption>
        </div>
        </div>
      </div>
    </div>
  );
}
