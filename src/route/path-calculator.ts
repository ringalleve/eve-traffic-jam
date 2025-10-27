import { ShipSize, SystemNode, SystemId } from '../types/types'
import { getKSpaceNodes } from './k-space/k-space-nodes'
import { getEveScoutNodes } from './eve-scout/eve-scout-nodes'
import { getEveMetroNodes } from './eve-metro/eve-metro-nodes'
import { getTripwireNodes } from './tripwire/tripwire-nodes'

export interface CalculateRouteInput {
    startSystemId: number
    endSystemId: number
    avoidSystemIds: number[]
    avoidLowSec: boolean
    avoidNullSec: boolean
    preferHighSec: boolean
    useEveScout: boolean
    useTripwire: boolean
    useEveMetro: boolean
    shipSize: ShipSize
}

const mergeNodes = (nodesMapsArray: Map<SystemId, SystemNode>[]): Map<SystemId, SystemNode> => {
    const total = new Map<SystemId, SystemNode>()
    
    // First pass: collect all nodes and their edges
    nodesMapsArray.forEach((nodeMap) => {
        nodeMap.forEach((node) => {
            if (total.has(node.systemId)) {
                // Merge edges of existing node
                const existingNode = total.get(node.systemId)!
                total.set(node.systemId, {
                    ...existingNode,
                    systemEdges: [...existingNode.systemEdges, ...node.systemEdges]
                })
            } else {
                // Add new node
                total.set(node.systemId, node)
            }
        })
    })
    
    return total
}

interface DijkstraNode {
    id: string
    distance: number
    visited: boolean
    previous: string | null
}

class DijkstraGraph {
    private nodes: Map<string, { [key: string]: number }> = new Map();

    addNode(id: string, edges: { [key: string]: number }): void {
        this.nodes.set(id, edges);
    }

    path(start: string, end: string, options: { avoid: string[] } = { avoid: [] }): string[] | null {
        // If start or end node doesn't exist, return null
        if (!this.nodes.has(start) || !this.nodes.has(end)) {
            return null;
        }

        // Initialize data structures
        const distances: Map<string, DijkstraNode> = new Map();
        const unvisited: Set<string> = new Set();
        
        // Initialize all nodes - fix iteration through Map
        Array.from(this.nodes.keys()).forEach(nodeId => {
            const isAvoid = options.avoid.includes(nodeId);
            
            // Skip avoided nodes (except start and end)
            if (isAvoid && nodeId !== start && nodeId !== end) {
                return;
            }
            
            distances.set(nodeId, {
                id: nodeId,
                distance: nodeId === start ? 0 : Infinity,
                visited: false,
                previous: null
            });
            unvisited.add(nodeId);
        });

        // Main Dijkstra algorithm
        while (unvisited.size > 0) {
            // Find the unvisited node with the smallest distance
            let current: string | null = null;
            let smallestDistance = Infinity;
            
            // Fix iteration through Set
            Array.from(unvisited).forEach(nodeId => {
                const node = distances.get(nodeId);
                if (node && node.distance < smallestDistance) {
                    smallestDistance = node.distance;
                    current = nodeId;
                }
            });
            
            // If we can't find a node or if the smallest distance is infinity,
            // there's no path to the end node
            if (current === null || smallestDistance === Infinity) {
                return null;
            }
            
            // If we've reached the end node, we're done
            if (current === end) {
                break;
            }
            
            // Mark the current node as visited
            unvisited.delete(current);
            const currentNode = distances.get(current);
            if (!currentNode) continue;
            currentNode.visited = true;
            
            // Get the neighbors of the current node
            const neighbors = this.nodes.get(current);
            if (!neighbors) continue;
            
            // Update the distances to the neighbors
            for (const [neighborId, weight] of Object.entries(neighbors)) {
                // Skip avoided nodes (except end)
                if (options.avoid.includes(neighborId) && neighborId !== end) {
                    continue;
                }
                
                const neighbor = distances.get(neighborId);
                if (!neighbor) continue;
                
                // Calculate the new distance
                const newDistance = currentNode.distance + weight;
                
                // If the new distance is smaller, update the neighbor
                if (newDistance < neighbor.distance) {
                    neighbor.distance = newDistance;
                    neighbor.previous = current;
                }
            }
        }
        
        // Reconstruct the path
        const path: string[] = [];
        let current = end;
        
        // If the end node wasn't reached, return null
        const endNode = distances.get(end);
        if (!endNode || endNode.distance === Infinity) {
            return null;
        }
        
        // Backtrack from the end node to the start node
        while (current !== start) {
            path.unshift(current);
            const currentNode = distances.get(current);
            if (!currentNode || currentNode.previous === null) {
                return null; // This shouldn't happen if we found a path
            }
            current = currentNode.previous;
        }
        
        // Add the start node to the beginning of the path
        path.unshift(start);
        
        return path;
    }
}

export const calculateRoute = async (
    calculateRouteInput: CalculateRouteInput
): Promise<SystemNode[]> => {
    const {
        startSystemId,
        endSystemId,
        avoidSystemIds,
        avoidLowSec,
        avoidNullSec,
        preferHighSec,
        useEveScout,
        useTripwire,
        useEveMetro
    } = calculateRouteInput

    const staticNodes = getKSpaceNodes()
    const nodesToMerge = [staticNodes]

    if (useEveScout) {
        const eveScoutNodes = await getEveScoutNodes()
        nodesToMerge.push(new Map(eveScoutNodes.map(node => [node.systemId, node])))
    }

    if (useTripwire) {
        const tripwireNodes = await getTripwireNodes()
        nodesToMerge.push(tripwireNodes)
    }

    if (useEveMetro) {
        const eveMetroNodes = await getEveMetroNodes()
        nodesToMerge.push(eveMetroNodes)
    }

    const mergedNodes = mergeNodes(nodesToMerge)
    
    // Build systems to avoid based on security status
    const systemsToAvoid = new Set<string>([...avoidSystemIds].map(id => `${id}`))
    
    mergedNodes.forEach((node) => {
        const security = node.systemSecurityStatus
        
        // Add to avoid list based on security preferences
        if (avoidLowSec && security >= 0.0 && security < 0.5) {
            systemsToAvoid.add(`${node.systemId}`)
        }
        if (avoidNullSec && security < 0.0) {
            systemsToAvoid.add(`${node.systemId}`)
        }
    })
    
    const graph = new DijkstraGraph()
    const neighbors: { [key: string]: { [key: string]: number } } = {}

    mergedNodes.forEach((node) => {
        const nodeNeighbors: { [key: string]: number } = {}
        node.systemEdges.forEach((edge) => {
            // Calculate edge weight based on preferences
            let weight = 1
            
            // If preferring high-sec, add penalty for non-high-sec systems
            if (preferHighSec) {
                const edgeSecurity = edge.systemSecurityStatus
                if (edgeSecurity < 0.5) {
                    weight = edgeSecurity < 0.0 ? 10 : 5  // Higher penalty for null-sec
                }
            }
            
            nodeNeighbors[edge.systemId] = weight
        })
        neighbors[node.systemId] = nodeNeighbors
        try {
            // Convert node ID to string to ensure consistent key format
            const nodeKey = `${node.systemId}`
            graph.addNode(nodeKey, nodeNeighbors)
        } catch (error) {
            console.error(`Error adding node ${node.systemId} (${node.systemName}):`, error)
            throw new Error(`Could not add node at key "${node.systemId}", make sure it's a valid node: ${(error as Error).message}`)
        }
    })

    const optimalRoute: string[] = graph.path(`${startSystemId}`, `${endSystemId}`, {
        avoid: Array.from(systemsToAvoid)
    }) as string[]

    if (optimalRoute === null) return []

    return optimalRoute
        .map((systemId) => mergedNodes.get(parseInt(systemId)))
        .filter((node): node is SystemNode => node !== undefined)
}