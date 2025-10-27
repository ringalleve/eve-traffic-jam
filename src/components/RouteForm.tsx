import { Stack, Autocomplete, TextField } from '@mui/material';
import { System } from '../data/systems';
import { SystemAlias, getSystemDisplayName } from '../utils/storage';

interface RouteFormProps {
    systems: System[];
    startSystem: System | null;
    endSystem: System | null;
    avoidSystems: System[];
    isLoading: boolean;
    isCalculating: boolean;
    isAuthenticated: boolean;
    aliases: SystemAlias[];
    onStartSystemChange: (system: System | null) => void;
    onEndSystemChange: (system: System | null) => void;
    onAvoidSystemsChange: (systems: System[]) => void;
}

export default function RouteForm({
    systems,
    startSystem,
    endSystem,
    avoidSystems,
    isLoading,
    isCalculating,
    isAuthenticated,
    aliases,
    onStartSystemChange,
    onEndSystemChange,
    onAvoidSystemsChange,
}: RouteFormProps) {
    const disabled = isLoading || isCalculating || !isAuthenticated;

    return (
        <Stack spacing={2}>
            <Autocomplete
                value={startSystem}
                onChange={(_, newValue) => onStartSystemChange(newValue)}
                options={systems}
                getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Start System"
                        disabled={disabled}
                        fullWidth
                    />
                )}
                loading={isLoading}
                loadingText="Loading systems..."
                noOptionsText="No systems found"
            />

            <Autocomplete
                value={endSystem}
                onChange={(_, newValue) => onEndSystemChange(newValue)}
                options={systems}
                getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="End System"
                        disabled={disabled}
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
                onChange={(_, newValue) => onAvoidSystemsChange(newValue)}
                options={systems}
                getOptionLabel={(option) => getSystemDisplayName(option.id, option.name, aliases)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Avoid Systems (Optional)"
                        disabled={disabled}
                        fullWidth
                    />
                )}
                loading={isLoading}
                loadingText="Loading systems..."
                noOptionsText="No systems found"
            />
        </Stack>
    );
}
