export interface RouteOptions {
    avoidSystems: number[];
    avoidLowSec: boolean;
    avoidNullSec: boolean;
    preferHighSec: boolean;
    useEveMetro: boolean;
    useEveScout: boolean;
    useTripwire: boolean;
}

export interface QuickLink {
    id: string;
    name: string;
    type: 'custom' | 'current-to-system' | 'fastest-to-jita' | 'safe-to-jita';
    startSystemId?: number;
    startSystemName?: string;
    endSystemId?: number;
    endSystemName?: string;
    options: RouteOptions;
}

export interface SystemAlias {
    systemId: number;
    systemName: string;
    alias: string;
}

const QUICK_LINKS_KEY = 'eve-traffic-jam-quick-links';
const ALIASES_KEY = 'eve-traffic-jam-aliases';

export const saveQuickLinks = (links: QuickLink[]): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(QUICK_LINKS_KEY, JSON.stringify(links));
    }
};

export const loadQuickLinks = (): QuickLink[] => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(QUICK_LINKS_KEY);
        return stored ? JSON.parse(stored) : [];
    }
    return [];
};

export const saveAliases = (aliases: SystemAlias[]): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ALIASES_KEY, JSON.stringify(aliases));
    }
};

export const loadAliases = (): SystemAlias[] => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ALIASES_KEY);
        return stored ? JSON.parse(stored) : [];
    }
    return [];
};

export const getSystemDisplayName = (systemId: number, systemName: string, aliases: SystemAlias[]): string => {
    const alias = aliases.find(a => a.systemId === systemId);
    return alias ? `${alias.alias} (${systemName})` : systemName;
};
