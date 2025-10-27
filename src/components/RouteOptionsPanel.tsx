import { Paper, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';

interface RouteOptionsProps {
    avoidLowSec: boolean;
    avoidNullSec: boolean;
    preferHighSec: boolean;
    useEveScout: boolean;
    useTripwire: boolean;
    useEveMetro: boolean;
    isLoading: boolean;
    isCalculating: boolean;
    isAuthenticated: boolean;
    onAvoidLowSecChange: (checked: boolean) => void;
    onAvoidNullSecChange: (checked: boolean) => void;
    onPreferHighSecChange: (checked: boolean) => void;
    onUseEveScoutChange: (checked: boolean) => void;
    onUseTripwireChange: (checked: boolean) => void;
    onUseEveMetroChange: (checked: boolean) => void;
}

export default function RouteOptionsPanel({
    avoidLowSec,
    avoidNullSec,
    preferHighSec,
    useEveScout,
    useTripwire,
    useEveMetro,
    isLoading,
    isCalculating,
    isAuthenticated,
    onAvoidLowSecChange,
    onAvoidNullSecChange,
    onPreferHighSecChange,
    onUseEveScoutChange,
    onUseTripwireChange,
    onUseEveMetroChange,
}: RouteOptionsProps) {
    const disabled = isLoading || isCalculating || !isAuthenticated;

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                Route Options
            </Typography>
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={avoidLowSec}
                            onChange={(e) => onAvoidLowSecChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Avoid Low-Sec"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={avoidNullSec}
                            onChange={(e) => onAvoidNullSecChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Avoid Null-Sec"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={preferHighSec}
                            onChange={(e) => onPreferHighSecChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Prefer High-Sec"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={useEveScout}
                            onChange={(e) => onUseEveScoutChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Use EVE-Scout (Thera/Turnur connections)"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={useTripwire}
                            onChange={(e) => onUseTripwireChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Use Tripwire (requires configuration)"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={useEveMetro}
                            onChange={(e) => onUseEveMetroChange(e.target.checked)}
                            disabled={disabled}
                        />
                    }
                    label="Use EVE-Metro"
                />
            </FormGroup>
        </Paper>
    );
}
