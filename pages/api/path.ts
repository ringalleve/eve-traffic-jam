import { NextApiRequest, NextApiResponse } from 'next'
import { calculateRoute, CalculateRouteInput } from '../../src/route/path-calculator'
import { parse } from 'cookie'
import fs from 'fs';
import path from 'path';
import { getCharacterAffiliation } from '../../src/utils/eve-api'
import { logUsage } from '../../src/utils/logging'

interface PathRequest {
    from: number
    to: number
    avoidSystems?: number[]
    avoidLowSec?: boolean
    avoidNullSec?: boolean
    preferHighSec?: boolean
    useEveMetro?: boolean
    useEveScout?: boolean
    useTripwire?: boolean
}

const configPath = path.resolve(process.cwd(), 'config.json');
const configData = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configData);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).json({ message: 'Method not allowed' })
        return
    }
    try {
        // Check authentication
        const cookies = parse(req.headers.cookie || '')
        const accessToken = cookies.access_token
        const characterId = cookies.character_id
        const characterName = cookies.character_name

        if (!accessToken || !characterId) {
            res.status(401).json({ message: 'Authentication required' })
            return
        }

        // Get character affiliation and check if corporation is allowed
        const affiliation = await getCharacterAffiliation(parseInt(characterId), accessToken)
        if (!config.allowedCorporationIds.includes(affiliation.corporation_id)) {
            res.status(403).json({ message: 'Access denied: Corporation not authorized' })
            return
        }

        const { 
            from, 
            to, 
            avoidSystems = [], 
            avoidLowSec = false, 
            avoidNullSec = false,
            preferHighSec = false,
            useEveMetro = true,
            useEveScout = true,
            useTripwire = false
        } = req.body as PathRequest

        if (!from || !to) {
            res.status(400).json({ message: 'Missing required parameters: from and to system IDs' })
            return
        }

        const input: CalculateRouteInput = {
            startSystemId: from,
            endSystemId: to,
            avoidSystemIds: avoidSystems,
            avoidLowSec,
            avoidNullSec,
            preferHighSec,
            useEveScout,
            useTripwire,
            useEveMetro,
            shipSize: 'Frigate'
        }

        const result = await calculateRoute(input)

        // Log successful path calculation
        await logUsage({
            timestamp: new Date().toISOString(),
            event: 'path_calculation',
            characterId,
            characterName: characterName || 'Unknown',
            corporationId: affiliation.corporation_id,
            additionalData: {
                fromSystemId: from,
                toSystemId: to,
                pathLength: result.length,
                usedEveScout: input.useEveScout,
                usedTripwire: input.useTripwire,
                usedEveMetro: input.useEveMetro,
                avoidSystemsCount: avoidSystems.length,
                avoidLowSec,
                avoidNullSec,
                preferHighSec
            }
        });

        res.status(200).json(result)
    } catch (error) {
        console.error('Error calculating path:', error)
        res.status(500).json({ message: 'Error calculating path' })
    }
} 