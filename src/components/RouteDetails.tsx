import { Paper, Box, Typography, Stack, Chip, Tooltip, IconButton } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import PublicIcon from '@mui/icons-material/Public';
import ExploreIcon from '@mui/icons-material/Explore';
import SatelliteIcon from '@mui/icons-material/Satellite';
import TrainIcon from '@mui/icons-material/Train';
import { SystemNode, EdgeSource } from '../types/types';
import { useEffect, useState } from 'react';

interface RouteDetailsProps {
    route: SystemNode[];
    isMobile?: boolean;
}

const getSecurityColor = (security: number): 'success' | 'warning' | 'error' => {
    if (security >= 0.5) return 'success';
    if (security >= 0.0) return 'warning';
    return 'error';
};

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

export default function RouteDetails({ route, isMobile = false }: RouteDetailsProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation on mount
        setIsVisible(true);
    }, []);

    const mobileSx = { 
        p: 2,
        animation: 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '@keyframes slideDown': {
            '0%': {
                opacity: 0,
                transform: 'translateY(-20px)',
            },
            '100%': {
                opacity: 1,
                transform: 'translateY(0)',
            },
        },
    } as const;

    const desktopSx = { 
        p: 4, 
        borderRadius: { xs: 2, md: '0 8px 8px 0' }, 
        flex: '0 0 600px',
        display: { xs: 'none', md: 'flex' }, 
        flexDirection: 'column', 
        bgcolor: '#f5f5f5', 
        minHeight: 0,
        animation: isVisible ? 'slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        '@keyframes slideInRight': {
            '0%': {
                opacity: 0,
                transform: 'translateX(100%)',
            },
            '100%': {
                opacity: 1,
                transform: 'translateX(0)',
            },
        },
    } as const;

    const paperSx = isMobile ? mobileSx : desktopSx;
    const variant = isMobile ? 'outlined' : 'elevation';
    const elevation = isMobile ? undefined : 3;

    return (
        <Paper variant={variant} elevation={elevation} sx={paperSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Route Details
                </Typography>
                <Tooltip title="Route information">
                    <IconButton size="small">
                        <InfoIcon />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={isMobile ? {} : { overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <Stack spacing={1}>
                    {route.map((system, index) => (
                        <Box 
                            key={index}
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                p: 1,
                                borderRadius: 1,
                                bgcolor: index % 2 === 0 ? 'action.hover' : 'background.paper',
                                animation: `fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.03}s backwards`,
                                '@keyframes fadeInUp': {
                                    '0%': {
                                        opacity: 0,
                                        transform: 'translateY(10px)',
                                    },
                                    '100%': {
                                        opacity: 1,
                                        transform: 'translateY(0)',
                                    },
                                },
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
            </Box>
        </Paper>
    );
}
