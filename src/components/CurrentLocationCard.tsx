import { Paper, Box, Typography, Chip, Button, CircularProgress } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

interface CurrentLocation {
    systemId: number;
    systemName: string;
    security: number;
}

interface CurrentLocationCardProps {
    currentLocation: CurrentLocation | null;
    isLoadingLocation: boolean;
    isLoading: boolean;
    isCalculating: boolean;
    onSetAsStart: () => void;
}

const getSecurityColor = (security: number): 'success' | 'warning' | 'error' => {
    if (security >= 0.5) return 'success';
    if (security >= 0.0) return 'warning';
    return 'error';
};

export default function CurrentLocationCard({ 
    currentLocation, 
    isLoadingLocation, 
    isLoading, 
    isCalculating, 
    onSetAsStart 
}: CurrentLocationCardProps) {
    if (!currentLocation) return null;

    return (
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
                onClick={onSetAsStart}
                disabled={isLoading || isCalculating}
            >
                Set as Start System
            </Button>
        </Paper>
    );
}
