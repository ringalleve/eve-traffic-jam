import { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    Tabs,
    Tab,
    Autocomplete,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { QuickLink, SystemAlias, saveQuickLinks, saveAliases, getSystemDisplayName } from '../utils/storage';
import { System } from '../data/systems';

interface SidebarProps {
    open: boolean;
    onClose: () => void;
    quickLinks: QuickLink[];
    setQuickLinks: (links: QuickLink[]) => void;
    aliases: SystemAlias[];
    setAliases: (aliases: SystemAlias[]) => void;
    systems: System[];
    onApplyQuickLink: (link: QuickLink) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

export default function Sidebar({
    open,
    onClose,
    quickLinks,
    setQuickLinks,
    aliases,
    setAliases,
    systems,
    onApplyQuickLink,
}: SidebarProps) {
    const [tabValue, setTabValue] = useState(0);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
    const [editingAlias, setEditingAlias] = useState<SystemAlias | null>(null);

    const [linkForm, setLinkForm] = useState<Partial<QuickLink>>({
        name: '',
        type: 'custom',
        options: {
            avoidSystems: [],
            avoidLowSec: false,
            avoidNullSec: false,
            preferHighSec: false,
            useEveMetro: true,
            useEveScout: true,
            useTripwire: false,
        },
    });

    const [aliasForm, setAliasForm] = useState<Partial<SystemAlias>>({
        alias: '',
    });

    const handleAddLink = () => {
        setEditingLink(null);
        setLinkForm({
            name: '',
            type: 'custom',
            options: {
                avoidSystems: [],
                avoidLowSec: false,
                avoidNullSec: false,
                preferHighSec: false,
                useEveMetro: true,
                useEveScout: true,
                useTripwire: false,
            },
        });
        setLinkDialogOpen(true);
    };

    const handleEditLink = (link: QuickLink) => {
        setEditingLink(link);
        setLinkForm(link);
        setLinkDialogOpen(true);
    };

    const handleSaveLink = () => {
        if (!linkForm.name) return;

        const newLink: QuickLink = {
            id: editingLink?.id || Date.now().toString(),
            name: linkForm.name!,
            type: linkForm.type!,
            startSystemId: linkForm.startSystemId,
            startSystemName: linkForm.startSystemName,
            endSystemId: linkForm.endSystemId,
            endSystemName: linkForm.endSystemName,
            options: linkForm.options!,
        };

        const updatedLinks = editingLink
            ? quickLinks.map(l => (l.id === editingLink.id ? newLink : l))
            : [...quickLinks, newLink];

        setQuickLinks(updatedLinks);
        saveQuickLinks(updatedLinks);
        setLinkDialogOpen(false);
    };

    const handleDeleteLink = (id: string) => {
        const updatedLinks = quickLinks.filter(l => l.id !== id);
        setQuickLinks(updatedLinks);
        saveQuickLinks(updatedLinks);
    };

    const handleAddAlias = () => {
        setEditingAlias(null);
        setAliasForm({ alias: '' });
        setAliasDialogOpen(true);
    };

    const handleEditAlias = (alias: SystemAlias) => {
        setEditingAlias(alias);
        setAliasForm(alias);
        setAliasDialogOpen(true);
    };

    const handleSaveAlias = () => {
        if (!aliasForm.systemId || !aliasForm.alias) return;

        const newAlias: SystemAlias = {
            systemId: aliasForm.systemId!,
            systemName: aliasForm.systemName!,
            alias: aliasForm.alias!,
        };

        const updatedAliases = editingAlias
            ? aliases.map(a => (a.systemId === editingAlias.systemId ? newAlias : a))
            : [...aliases, newAlias];

        setAliases(updatedAliases);
        saveAliases(updatedAliases);
        setAliasDialogOpen(false);
    };

    const handleDeleteAlias = (systemId: number) => {
        const updatedAliases = aliases.filter(a => a.systemId !== systemId);
        setAliases(updatedAliases);
        saveAliases(updatedAliases);
    };

    const getLinkDisplayText = (link: QuickLink): string => {
        switch (link.type) {
            case 'custom':
                return `${getSystemDisplayName(link.startSystemId!, link.startSystemName!, aliases)} → ${getSystemDisplayName(link.endSystemId!, link.endSystemName!, aliases)}`;
            case 'current-to-system':
                return `Current → ${getSystemDisplayName(link.endSystemId!, link.endSystemName!, aliases)}`;
            case 'fastest-to-jita':
                return 'Fastest → Jita';
            case 'safe-to-jita':
                return 'Safe → Jita';
            default:
                return link.name;
        }
    };

    return (
        <>
            <Drawer anchor="left" open={open} onClose={onClose}>
                <Box sx={{ width: 400, p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Quick Access
                    </Typography>

                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                        <Tab label="Quick Links" />
                        <Tab label="Aliases" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            fullWidth
                            onClick={handleAddLink}
                            sx={{ mb: 2 }}
                        >
                            Add Quick Link
                        </Button>

                        <List>
                            {quickLinks.map(link => (
                                <ListItem key={link.id} divider>
                                    <ListItemText
                                        primary={link.name}
                                        secondary={getLinkDisplayText(link)}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => onApplyQuickLink(link)}
                                            sx={{ mr: 1 }}
                                        >
                                            <PlayArrowIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleEditLink(link)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" onClick={() => handleDeleteLink(link.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            fullWidth
                            onClick={handleAddAlias}
                            sx={{ mb: 2 }}
                        >
                            Add Alias
                        </Button>

                        <List>
                            {aliases.map(alias => (
                                <ListItem key={alias.systemId} divider>
                                    <ListItemText
                                        primary={alias.alias}
                                        secondary={alias.systemName}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleEditAlias(alias)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" onClick={() => handleDeleteAlias(alias.systemId)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </TabPanel>
                </Box>
            </Drawer>

            {/* Quick Link Dialog */}
            <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingLink ? 'Edit Quick Link' : 'Add Quick Link'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Link Name"
                        fullWidth
                        value={linkForm.name || ''}
                        onChange={e => setLinkForm({ ...linkForm, name: e.target.value })}
                        sx={{ mt: 2, mb: 2 }}
                    />

                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Link Type</InputLabel>
                        <Select
                            value={linkForm.type || 'custom'}
                            onChange={e => setLinkForm({ ...linkForm, type: e.target.value as QuickLink['type'] })}
                        >
                            <MenuItem value="custom">Custom Route</MenuItem>
                            <MenuItem value="current-to-system">Current Location to System</MenuItem>
                            <MenuItem value="fastest-to-jita">Fastest Route to Jita</MenuItem>
                            <MenuItem value="safe-to-jita">Safe Route to Jita</MenuItem>
                        </Select>
                    </FormControl>

                    {linkForm.type === 'custom' && (
                        <>
                            <Autocomplete
                                options={systems}
                                getOptionLabel={option => getSystemDisplayName(option.id, option.name, aliases)}
                                value={systems.find(s => s.id === linkForm.startSystemId) || null}
                                onChange={(_, system) =>
                                    setLinkForm({
                                        ...linkForm,
                                        startSystemId: system?.id,
                                        startSystemName: system?.name,
                                    })
                                }
                                renderInput={params => <TextField {...params} label="Start System" />}
                                sx={{ mb: 2 }}
                            />
                            <Autocomplete
                                options={systems}
                                getOptionLabel={option => getSystemDisplayName(option.id, option.name, aliases)}
                                value={systems.find(s => s.id === linkForm.endSystemId) || null}
                                onChange={(_, system) =>
                                    setLinkForm({
                                        ...linkForm,
                                        endSystemId: system?.id,
                                        endSystemName: system?.name,
                                    })
                                }
                                renderInput={params => <TextField {...params} label="End System" />}
                                sx={{ mb: 2 }}
                            />
                        </>
                    )}

                    {linkForm.type === 'current-to-system' && (
                        <Autocomplete
                            options={systems}
                            getOptionLabel={option => getSystemDisplayName(option.id, option.name, aliases)}
                            value={systems.find(s => s.id === linkForm.endSystemId) || null}
                            onChange={(_, system) =>
                                setLinkForm({
                                    ...linkForm,
                                    endSystemId: system?.id,
                                    endSystemName: system?.name,
                                })
                            }
                            renderInput={params => <TextField {...params} label="Destination System" />}
                            sx={{ mb: 2 }}
                        />
                    )}

                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                        Route Options
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.avoidLowSec || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, avoidLowSec: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Avoid Low-Sec"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.avoidNullSec || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, avoidNullSec: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Avoid Null-Sec"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.preferHighSec || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, preferHighSec: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Prefer High-Sec"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.useEveScout || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, useEveScout: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Use EVE-Scout"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.useEveMetro || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, useEveMetro: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Use EVE-Metro"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={linkForm.options?.useTripwire || false}
                                    onChange={e =>
                                        setLinkForm({
                                            ...linkForm,
                                            options: { ...linkForm.options!, useTripwire: e.target.checked },
                                        })
                                    }
                                />
                            }
                            label="Use Tripwire"
                        />
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveLink} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Alias Dialog */}
            <Dialog open={aliasDialogOpen} onClose={() => setAliasDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingAlias ? 'Edit Alias' : 'Add Alias'}</DialogTitle>
                <DialogContent>
                    <Autocomplete
                        options={systems}
                        getOptionLabel={option => option.name}
                        value={systems.find(s => s.id === aliasForm.systemId) || null}
                        onChange={(_, system) =>
                            setAliasForm({
                                ...aliasForm,
                                systemId: system?.id,
                                systemName: system?.name,
                            })
                        }
                        renderInput={params => <TextField {...params} label="System" />}
                        sx={{ mt: 2, mb: 2 }}
                        disabled={!!editingAlias}
                    />

                    <TextField
                        label="Alias"
                        fullWidth
                        value={aliasForm.alias || ''}
                        onChange={e => setAliasForm({ ...aliasForm, alias: e.target.value })}
                        placeholder="e.g., Home, Staging, J123456"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAliasDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveAlias} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
