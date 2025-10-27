import axios from 'axios'
import { EdgeSource, SystemId, SystemNode, SystemName, SystemSecurityStatus } from '../../types/types'
import { TripSystemEdge, Wormohole as TripwireWormhole, Signature as TripwireSignature } from './types'
import {
    groupBy,
} from '../../utils'
import systemsData from '../../../public/systems.json'

interface SystemData {
    solarSystemId: number
    solarSystemName: string
    security: number
    regionID: number
    wormholeClassId: number
    connectedSystems: number[]
}

const systemsMap = new Map<SystemId, SystemData>(
    systemsData.map(system => [system.solarSystemId, system])
)

const getSystem = (systemId: string): SystemData | undefined => {
    return systemsMap.get(parseInt(systemId))
}

export const fetchDataFromTripwire = async (): Promise<
    [TripwireWormhole[], TripwireSignature[]]
> => {
    // Create auth object at runtime, not at module load time
    // This ensures environment variables are loaded
    const TRIPWIRE_AUTH = {
        auth: {
            username: process.env.TRIPWIRE_USER || '',
            password: process.env.TRIPWIRE_PASSWORD || ''
        }
    }
    
    const TRIPWIRE_MASK = process.env.TRIPWIRE_MASK || '0'
    
    const { data: wormholeData } = await axios.get<TripwireWormhole[]>(
        `${process.env.TRIPWIRE_HOST}/api.php?q=/wormholes&maskID=${TRIPWIRE_MASK}`,
        TRIPWIRE_AUTH
    )
    const { data: signatureData } = await axios.get<TripwireSignature[]>(
        `${process.env.TRIPWIRE_HOST}/api.php?q=/signatures&maskID=${TRIPWIRE_MASK}`,
        TRIPWIRE_AUTH
    )
    const signatures = signatureData.filter((sig) => sig.type === 'wormhole')
    const wormholes = wormholeData.filter((wh) => {
        return wh.initialID !== undefined && wh.secondaryID !== undefined
    })
    
    return [wormholes, signatures]
}

export const getTripwireNodes = async (): Promise<Map<SystemId, SystemNode>> => {
    try {
        const tripwireData = await fetchDataFromTripwire()
        
        const wormholeData: TripwireWormhole[] = Object.values(tripwireData[0])
        const signatureData: TripwireSignature[] = Object.values(tripwireData[1])
        const wormholeSignatureData = signatureData.filter((sig) => sig.type === 'wormhole')

        const TRIPWIRE_MASK = process.env.TRIPWIRE_MASK || '0'
        const edges: TripSystemEdge[] = wormholeData
            .filter((wh) => wh.maskID === TRIPWIRE_MASK)
            .flatMap((wh) => {
                const initialSig = wormholeSignatureData.find((sig) => sig.id === wh.initialID)
                const secondarySig = wormholeSignatureData.find((sig) => sig.id === wh.secondaryID)
                if (!initialSig?.systemID || !secondarySig?.systemID) return []
                const initialSystem = getSystem(initialSig.systemID)
                const secondarySystem = getSystem(secondarySig.systemID)
                if (!initialSystem || !secondarySystem) return []
                return [
                    {
                        fromSolarSystemID: parseInt(secondarySig.systemID),
                        systemId: parseInt(initialSig.systemID),
                        systemName: initialSystem.solarSystemName as SystemName,
                        systemSecurityStatus: initialSystem.security as SystemSecurityStatus,
                        edgeSource: 'tripwire' as EdgeSource,
                        signatureSrc: initialSig.signatureID,
                        signatureDst: secondarySig.signatureID,
                        wormholeTypeSrc: wh.type,
                        wormholeTypeDst: wh.type,
                        wormholeMass: wh.mass,
                        wormholeEol: wh.life,
                        nodeName: initialSig.name
                    },
                    {
                        fromSolarSystemID: parseInt(initialSig.systemID),
                        systemId: parseInt(secondarySig.systemID),
                        systemName: secondarySystem.solarSystemName as SystemName,
                        systemSecurityStatus: secondarySystem.security as SystemSecurityStatus,
                        edgeSource: 'tripwire' as EdgeSource,
                        signatureSrc: secondarySig.signatureID,
                        signatureDst: initialSig.signatureID,
                        wormholeTypeSrc: 'K162',
                        wormholeTypeDst: 'K162',
                        wormholeMass: wh.mass,
                        wormholeEol: wh.life,
                        nodeName: secondarySig.name
                    }
                ]
            })

        const edgesBySystem = groupBy(edges, 'fromSolarSystemID')
        const tripwireNodes = new Map<SystemId, SystemNode>()

        Object.keys(edgesBySystem).forEach((systemId) => {
            const system = getSystem(systemId)
            if (!system) return
            tripwireNodes.set(parseInt(systemId), {
                systemId: parseInt(systemId),
                systemName: system.solarSystemName as SystemName,
                systemSecurityStatus: system.security as SystemSecurityStatus,
                systemEdges: edgesBySystem[systemId]
            })
        })

        return tripwireNodes
    } catch (e) {
        console.error('Error fetching Tripwire nodes:', e)
        return new Map()
    }
} 