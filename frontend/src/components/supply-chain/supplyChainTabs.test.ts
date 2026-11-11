import { describe, expect, it } from 'vitest';
import { canRunSupplyChainReports, roleGuidance, roleLabel, visibleTabs } from './supplyChainTabs';

describe('canRunSupplyChainReports', () => {
  // The portal already filters the catalog to the reports this person may run, so any Supply Chain report in the
  // list means they can open the Reports tab. A Finance or Inventory report must not.
  it('is true when the person may run at least one Supply Chain report', () => {
    expect(canRunSupplyChainReports([{ domain: 'Finance' }, { domain: 'SupplyChain' }])).toBe(true);
  });

  it('is false when they may run only reports from other domains', () => {
    expect(canRunSupplyChainReports([{ domain: 'Finance' }, { domain: 'InventoryManagement' }])).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(canRunSupplyChainReports([])).toBe(false);
  });
});

describe('visibleTabs', () => {
  it('shows Workbench, Dashboard and Categories to everyone, in that order', () => {
    expect(visibleTabs(false).map(t => t.id)).toEqual(['workbench', 'dashboard', 'categories']);
  });

  it('adds Reports, before Categories, for a person who can run Supply Chain reports', () => {
    expect(visibleTabs(true).map(t => t.id)).toEqual(['workbench', 'dashboard', 'reports', 'categories']);
  });

  it('gives each tab a label for the person', () => {
    expect(visibleTabs(true).map(t => t.label)).toEqual(['Workbench', 'Dashboard', 'Reports', 'Categories']);
  });
});

describe('roleLabel', () => {
  it.each([
    ['buyer', 'Buyer'],
    ['planner', 'Planner'],
    ['manager', 'Manager'],
  ] as const)('names the %s role', (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });
});

describe('roleGuidance', () => {
  it('tells a buyer they edit their own lines only', () => {
    expect(roleGuidance('buyer')).toMatch(/own lines/i);
    expect(roleGuidance('buyer')).toMatch(/Category and Details/);
  });

  it('tells a planner they write Planners Notes only', () => {
    expect(roleGuidance('planner')).toMatch(/Planners Notes/);
    expect(roleGuidance('planner')).toMatch(/belong to buyers/i);
  });

  it('tells a manager they edit every line, including generic buyer codes', () => {
    expect(roleGuidance('manager')).toMatch(/every line/i);
    expect(roleGuidance('manager')).toMatch(/generic buyer codes/i);
  });
});
