import { Box, Button, CircularProgress, Typography, Avatar, IconButton } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';
import { CharacterInfo } from '../utils/auth';

interface CharacterProfileProps {
    characterInfo: CharacterInfo;
    isRefreshing: boolean;
    mounted: boolean;
    onLogout: () => void;
}

export default function CharacterProfile({ characterInfo, isRefreshing, mounted, onLogout }: CharacterProfileProps) {
    if (!mounted) return null;

    if (isRefreshing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (characterInfo.isAuthenticated && characterInfo.characterName) {
        return (
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
                    onClick={onLogout}
                    size="small"
                    sx={{ ml: 1 }}
                >
                    <LogoutIcon />
                </IconButton>
            </Box>
        );
    }

    return (
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
    );
}
