import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Stack,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Divider,
    Fab,
} from '@mui/material';
import { System, loadSystems, getSystems } from '../data/systems';
import { SystemNode } from '../types/types';
import { getCharacterInfo, CharacterInfo, refreshSession, logout } from '../utils/auth';
import RouteIcon from '@mui/icons-material/Route';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import CharacterProfile from './CharacterProfile';
import CurrentLocationCard from './CurrentLocationCard';
import RouteForm from './RouteForm';
import RouteOptionsPanel from './RouteOptionsPanel';
import RouteDetails from './RouteDetails';
import { QuickLink, SystemAlias, loadQuickLinks, loadAliases } from '../utils/storage';

interface CurrentLocation {
    systemId: number;
    systemName: string;
    security: number;
}

export default function PathCalculator() {
    const [systems, setSystems] = useState<System[]>([]);
    const [startSystem, setStartSystem] = useState<System | null>(null);
    const [endSystem, setEndSystem] = useState<System | null>(null);
    const [avoidSystems, setAvoidSystems] = useState<System[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [route, setRoute] = useState<SystemNode[] | null>(null);
    const [characterInfo, setCharacterInfo] = useState<CharacterInfo>({
        characterId: '',
        characterName: '',
        isAuthenticated: false,
    });
    const [mounted, setMounted] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    
    // Routing options
    const [avoidLowSec, setAvoidLowSec] = useState(false);
    const [avoidNullSec, setAvoidNullSec] = useState(false);
    const [preferHighSec, setPreferHighSec] = useState(false);
    const [useEveMetro, setUseEveMetro] = useState(true);
    const [useEveScout, setUseEveScout] = useState(true);
    const [useTripwire, setUseTripwire] = useState(false);
    
    // Sidebar and storage
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [aliases, setAliases] = useState<SystemAlias[]>([]);

    // Open sidebar by default on large screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1200) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            setMounted(true);
            const info = await getCharacterInfo(document.cookie);
            setCharacterInfo(info);

            // If we have a refresh token, try to refresh the session
            if (info.isAuthenticated) {
                setIsRefreshing(true);
                try {
                    const refreshed = await refreshSession();
                    if (refreshed) {
                        // Fetch updated character info after refresh
                        const newInfo = await getCharacterInfo(document.cookie);
                        setCharacterInfo(newInfo);
                    }
                } catch (error) {
                    console.error('Failed to refresh session:', error);
                } finally {
                    setIsRefreshing(false);
                }
            }
        };

        initializeAuth();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                await loadSystems();
                setSystems(getSystems());
                
                // Load quick links and aliases from localStorage
                setQuickLinks(loadQuickLinks());
                setAliases(loadAliases());
            } catch (error) {
                console.error('Failed to load systems:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        const fetchLocation = async () => {
            if (!characterInfo.isAuthenticated || !characterInfo.characterId) {
                return;
            }

            setIsLoadingLocation(true);
            try {
                const response = await fetch('/api/location');
                if (response.ok) {
                    const location = await response.json();
                    setCurrentLocation(location);
                } else {
                    console.error('Failed to fetch location');
                }
            } catch (error) {
                console.error('Error fetching location:', error);
            } finally {
                setIsLoadingLocation(false);
            }
        };

        fetchLocation();
    }, [characterInfo.isAuthenticated, characterInfo.characterId]);

    const handleSetCurrentAsStart = () => {
        if (currentLocation) {
            const system = systems.find(s => s.id === currentLocation.systemId);
            if (system) {
                setStartSystem(system);
            }
        }
    };

    const handleApplyQuickLink = (link: QuickLink) => {
        // Find Jita system for Jita routes
        const jitaSystem = systems.find(s => s.name === 'Jita');
        
        switch (link.type) {
            case 'custom':
                const start = systems.find(s => s.id === link.startSystemId);
                const end = systems.find(s => s.id === link.endSystemId);
                if (start && end) {
                    setStartSystem(start);
                    setEndSystem(end);
                }
                break;
            case 'current-to-system':
                if (currentLocation) {
                    const currentSys = systems.find(s => s.id === currentLocation.systemId);
                    const dest = systems.find(s => s.id === link.endSystemId);
                    if (currentSys && dest) {
                        setStartSystem(currentSys);
                        setEndSystem(dest);
                    }
                }
                break;
            case 'fastest-to-jita':
                if (currentLocation && jitaSystem) {
                    const currentSys = systems.find(s => s.id === currentLocation.systemId);
                    if (currentSys) {
                        setStartSystem(currentSys);
                        setEndSystem(jitaSystem);
                    }
                }
                break;
            case 'safe-to-jita':
                if (currentLocation && jitaSystem) {
                    const currentSys = systems.find(s => s.id === currentLocation.systemId);
                    if (currentSys) {
                        setStartSystem(currentSys);
                        setEndSystem(jitaSystem);
                    }
                }
                break;
        }
        
        // Apply route options
        setAvoidSystems(systems.filter(s => link.options.avoidSystems.includes(s.id)));
        setAvoidLowSec(link.options.avoidLowSec);
        setAvoidNullSec(link.options.avoidNullSec);
        setPreferHighSec(link.options.preferHighSec);
        setUseEveMetro(link.options.useEveMetro);
        setUseEveScout(link.options.useEveScout);
        setUseTripwire(link.options.useTripwire);
        
        setSidebarOpen(false);
    };

    const handleCalculate = async () => {
        if (!startSystem || !endSystem) return;

        setIsCalculating(true);
        setError(null);
        setRoute(null);

        try {
            const response = await fetch('/api/path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: startSystem.id,
                    to: endSystem.id,
                    avoidSystems: avoidSystems.map(s => s.id),
                    avoidLowSec,
                    avoidNullSec,
                    preferHighSec,
                    useEveMetro,
                    useEveScout,
                    useTripwire
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                switch (response.status) {
                    case 401:
                        throw new Error('Please log in to calculate paths');
                    case 403:
                        throw new Error('Your corporation is not authorized to use this service');
                    case 400:
                        throw new Error('Please select both start and end systems');
                    default:
                        throw new Error(errorData.message || 'Failed to calculate path');
                }
            }

            const result = await response.json();
            setRoute(result);
        } catch (error) {
            console.error('Error calculating path:', error);
            setError(error instanceof Error ? error.message : 'Failed to calculate path');
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <>
            {/* Menu button - only show on mobile/tablet or when sidebar closed on desktop */}
            <Fab
                color="primary"
                aria-label="menu"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                    zIndex: 1100,
                    display: { 
                        xs: 'flex', 
                        lg: sidebarOpen ? 'none' : 'flex' 
                    },
                }}
            >
                <MenuIcon />
            </Fab>

            <Box sx={{ 
                maxWidth: { xs: 600, md: route ? 1200 : 600, lg: sidebarOpen && route ? 1600 : sidebarOpen ? 1000 : (route ? 1200 : 600) }, 
                mx: 'auto', 
                mt: 4, 
                p: 3,
                minHeight: '100vh'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    gap: 0,
                    flexDirection: { xs: 'column', md: route ? 'row' : 'column', lg: sidebarOpen ? 'row' : (route ? 'row' : 'column') },
                    alignItems: 'stretch'
                }}>
                {/* Sidebar on left for large screens */}
                <Box sx={{ 
                    display: { xs: 'none', lg: sidebarOpen ? 'block' : 'none' },
                    flex: '0 0 400px',
                }}>
                    <Sidebar
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        quickLinks={quickLinks}
                        setQuickLinks={setQuickLinks}
                        aliases={aliases}
                        setAliases={setAliases}
                        systems={systems}
                        onApplyQuickLink={handleApplyQuickLink}
                    />
                </Box>

                {/* Sidebar for mobile and tablet */}
                <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                    <Sidebar
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                        quickLinks={quickLinks}
                        setQuickLinks={setQuickLinks}
                        aliases={aliases}
                        setAliases={setAliases}
                        systems={systems}
                        onApplyQuickLink={handleApplyQuickLink}
                    />
                </Box>

                <Paper elevation={3} sx={{ 
                    p: 4, 
                    borderRadius: { 
                        xs: 2, 
                        md: route ? '8px 0 0 8px' : 2,
                        lg: sidebarOpen && route ? '0' : sidebarOpen ? '0 8px 8px 0' : (route ? '8px 0 0 8px' : 2)
                    }, 
                    flex: { xs: '1 1 auto', md: route ? '0 0 600px' : '1 1 auto', lg: route ? '0 0 600px' : '1 1 auto' }, 
                    maxWidth: { xs: '100%', md: route ? '600px' : '600px' }, 
                    mx: { xs: 0, md: route ? 0 : 'auto', lg: sidebarOpen && !route ? 0 : (route ? 0 : 'auto') } 
                }}>
                <Stack spacing={3}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            EVE TrafficJam
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Find the optimal route between systems
                        </Typography>
                    </Box>

                    <CharacterProfile 
                        characterInfo={characterInfo}
                        isRefreshing={isRefreshing}
                        mounted={mounted}
                        onLogout={logout}
                    />

                    {characterInfo.isAuthenticated && (
                        <CurrentLocationCard
                            currentLocation={currentLocation}
                            isLoadingLocation={isLoadingLocation}
                            isLoading={isLoading}
                            isCalculating={isCalculating}
                            onSetAsStart={handleSetCurrentAsStart}
                        />
                    )}

                    <Divider/>

                    <RouteForm
                        systems={systems}
                        startSystem={startSystem}
                        endSystem={endSystem}
                        avoidSystems={avoidSystems}
                        isLoading={isLoading}
                        isCalculating={isCalculating}
                        isAuthenticated={characterInfo.isAuthenticated}
                        aliases={aliases}
                        onStartSystemChange={setStartSystem}
                        onEndSystemChange={setEndSystem}
                        onAvoidSystemsChange={setAvoidSystems}
                    />

                    <RouteOptionsPanel
                        avoidLowSec={avoidLowSec}
                        avoidNullSec={avoidNullSec}
                        preferHighSec={preferHighSec}
                        useEveScout={useEveScout}
                        useTripwire={useTripwire}
                        useEveMetro={useEveMetro}
                        isLoading={isLoading}
                        isCalculating={isCalculating}
                        isAuthenticated={characterInfo.isAuthenticated}
                        onAvoidLowSecChange={setAvoidLowSec}
                        onAvoidNullSecChange={setAvoidNullSec}
                        onPreferHighSecChange={setPreferHighSec}
                        onUseEveScoutChange={setUseEveScout}
                        onUseTripwireChange={setUseTripwire}
                        onUseEveMetroChange={setUseEveMetro}
                    />

                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        size="large"
                        onClick={handleCalculate}
                        disabled={!startSystem || !endSystem || isLoading || isCalculating || !characterInfo.isAuthenticated}
                        startIcon={isCalculating ? <CircularProgress size={20} color="inherit" /> : <RouteIcon />}
                    >
                        {isCalculating ? 'Calculating...' : 'Calculate Path'}
                    </Button>

                    {!characterInfo.isAuthenticated && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Please log in to calculate paths
                        </Alert>
                    )}

                    {error && (
                        <Alert 
                            severity="error" 
                            onClose={() => setError(null)}
                            sx={{ mt: 2 }}
                        >
                            {error}
                        </Alert>
                    )}

                    {route && (
                        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                            <RouteDetails route={route} isMobile={true} />
                        </Box>
                    )}
                </Stack>
            </Paper>
            
            {route && <RouteDetails route={route} isMobile={false} />}
            </Box>
        </Box>
        </>
    );
}
