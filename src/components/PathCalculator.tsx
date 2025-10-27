import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Stack,
    Typography,
    Autocomplete,
    TextField,
    CircularProgress,
    Alert,
    Paper,
    Divider,
    Chip,
    Tooltip,
    IconButton,
    Avatar,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Fab,
} from '@mui/material';
import { System, loadSystems, getSystems } from '../data/systems';
import { SystemNode, EdgeSource } from '../types/types';
import { getCharacterInfo, CharacterInfo, refreshSession } from '../utils/auth';
import SecurityIcon from '@mui/icons-material/Security';
import RouteIcon from '@mui/icons-material/Route';
import InfoIcon from '@mui/icons-material/Info';
import PublicIcon from '@mui/icons-material/Public';
import ExploreIcon from '@mui/icons-material/Explore';
import SatelliteIcon from '@mui/icons-material/Satellite';
import TrainIcon from '@mui/icons-material/Train';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import { QuickLink, SystemAlias, loadQuickLinks, loadAliases, getSystemDisplayName } from '../utils/storage';

const getEdgeSourceIcon = (source: EdgeSource) => {
    switch (source) {
        case 'k-space':
            return <PublicIcon fontSize="small" />;
        case 'eve-scout-thera':
        case 'eve-scout-turnur':
            return <ExploreIcon fontSize="small" />;
        case 'tripwire':
            return <SatelliteIcon fontSize="small" />;
        case 'eve-metro':
            return <TrainIcon fontSize="small" />;
        default:
            return <PublicIcon fontSize="small" />;
    }
};

const getEdgeSourceLabel = (source: EdgeSource) => {
    switch (source) {
        case 'k-space':
            return 'K-Space';
        case 'eve-scout-thera':
            return 'Thera';
        case 'eve-scout-turnur':
            return 'Turnur';
        case 'tripwire':
            return 'Tripwire';
        case 'eve-metro':
            return 'EVE Metro';
        default:
            return source;
    }
};

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


    const handleLogout = () => {
        // Import logout function dynamically to avoid SSR issues
        import('../utils/auth').then(({ logout }) => logout());
    };

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

    const getSecurityColor = (security: number) => {
        if (security >= 0.5) return 'success';
        if (security >= 0.0) return 'warning';
        return 'error';
    };

    return (
        <>
            <Fab
                color="primary"
                aria-label="menu"
                onClick={() => setSidebarOpen(true)}
                sx={{
                    position: 'fixed',
                    top: 16,
                    left: 16,
                }}
            >
                <MenuIcon />
            </Fab>

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

            <Box sx={{ 
                maxWidth: 600, 
                mx: 'auto', 
                mt: 4, 
                p: 3,
                minHeight: '100vh'
            }}>
                <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Stack spacing={3}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            EVE TrafficJam
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Find the optimal route between systems
                        </Typography>
                    </Box>

                    {mounted && (isRefreshing ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : characterInfo.isAuthenticated && characterInfo.characterName ? (
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                flexDirection: 'column',
                                gap: 1
                            }}
                        >
                            <Avatar
                                src={`https://images.evetech.net/characters/${characterInfo.characterId}/portrait?size=256`}
                                sx={{ width: 128, height: 128 }}
                            />
                            <Typography variant="body1" sx={{ mx: 1 }}>
                                {characterInfo.characterName}
                            </Typography>
                            <IconButton
                                onClick={handleLogout}
                                size="small"
                                sx={{ ml: 1 }}
                            >
                                <LogoutIcon />
                            </IconButton>
                        </Box>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            href="/api/auth/login"
                            startIcon={<SecurityIcon />}
                        >
                            Login with EVE SSO
                        </Button>
                    ))}

                    {characterInfo.isAuthenticated && currentLocation && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle2">
                                    Current Location
                                </Typography>
                                {isLoadingLocation && <CircularProgress size={16} />}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    {currentLocation.systemName}
                                </Typography>
                                <Chip 
                                    icon={<SecurityIcon />}
                                    label={currentLocation.security.toFixed(1)}
                                    color={getSecurityColor(currentLocation.security)}
                                    size="small"
                                />
                            </Box>
                            <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={handleSetCurrentAsStart}
                                disabled={isLoading || isCalculating}
                            >
                                Set as Start System
                            </Button>
                        </Paper>
                    )}

                    <Divider/>

                    <Stack spacing={2}>
                        <Autocomplete
                            value={startSystem}
                            onChange={(_, newValue) => setStartSystem(newValue)}
                            options={systems}
                            getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Start System"
                                    disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                    fullWidth
                                />
                            )}
                            loading={isLoading}
                            loadingText="Loading systems..."
                            noOptionsText="No systems found"
                        />

                        <Autocomplete
                            value={endSystem}
                            onChange={(_, newValue) => setEndSystem(newValue)}
                            options={systems}
                            getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="End System"
                                    disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                    fullWidth
                                />
                            )}
                            loading={isLoading}
                            loadingText="Loading systems..."
                            noOptionsText="No systems found"
                        />

                        <Autocomplete
                            multiple
                            value={avoidSystems}
                            onChange={(_, newValue) => setAvoidSystems(newValue)}
                            options={systems}
                            getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Avoid Systems (Optional)"
                                    disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                    fullWidth
                                />
                            )}
                            loading={isLoading}
                            loadingText="Loading systems..."
                            noOptionsText="No systems found"
                        />

                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Route Options
                            </Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={avoidLowSec}
                                            onChange={(e) => setAvoidLowSec(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Avoid Low-Sec"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={avoidNullSec}
                                            onChange={(e) => setAvoidNullSec(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Avoid Null-Sec"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={preferHighSec}
                                            onChange={(e) => setPreferHighSec(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Prefer High-Sec"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={useEveScout}
                                            onChange={(e) => setUseEveScout(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Use EVE-Scout (Thera/Turnur connections)"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={useTripwire}
                                            onChange={(e) => setUseTripwire(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Use Tripwire (requires configuration)"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={useEveMetro}
                                            onChange={(e) => setUseEveMetro(e.target.checked)}
                                            disabled={isLoading || isCalculating || !characterInfo.isAuthenticated}
                                        />
                                    }
                                    label="Use EVE-Metro"
                                />
                            </FormGroup>
                        </Paper>
                    </Stack>

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
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                    Route Details
                                </Typography>
                                <Tooltip title="Route information">
                                    <IconButton size="small">
                                        <InfoIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Stack spacing={1}>
                                {route.map((system, index) => (
                                    <Box 
                                        key={index}
                                        sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: index % 2 === 0 ? 'action.hover' : 'background.paper'
                                        }}
                                    >
                                        <Typography sx={{ minWidth: 30, fontWeight: 'bold' }}>
                                            {index + 1}.
                                        </Typography>
                                        <Typography sx={{ flexGrow: 1 }}>
                                            {system.systemName}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Chip 
                                                icon={<SecurityIcon />}
                                                label={system.systemSecurityStatus.toFixed(1)}
                                                color={getSecurityColor(system.systemSecurityStatus)}
                                                size="small"
                                            />
                                            {index < route.length - 1 && system.systemEdges[0]?.edgeSource && (
                                                <Tooltip title={`Connection via ${getEdgeSourceLabel(system.systemEdges[0].edgeSource)}`}>
                                                    <Chip
                                                        icon={getEdgeSourceIcon(system.systemEdges[0].edgeSource)}
                                                        label={getEdgeSourceLabel(system.systemEdges[0].edgeSource)}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    )}
                </Stack>
            </Paper>
        </Box>
        </>
    );
}
