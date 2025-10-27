import { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'cookie'
import axios from 'axios'
import systemsData from '../../public/systems.json'

interface SystemData {
    solarSystemId: number
    solarSystemName: string
    security: number
}

const systemsMap = new Map<number, SystemData>(
    systemsData.map((system: SystemData) => [system.solarSystemId, system])
)

interface LocationResponse {
    solar_system_id: number
    station_id?: number
    structure_id?: number
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.status(405).json({ message: 'Method not allowed' })
        return
    }

    try {
        const cookies = parse(req.headers.cookie || '')
        const accessToken = cookies.access_token
        const characterId = cookies.character_id

        if (!accessToken || !characterId) {
            res.status(401).json({ message: 'Authentication required' })
            return
        }

        // Fetch character location from ESI
        const response = await axios.get<LocationResponse>(
            `https://esi.evetech.net/latest/characters/${characterId}/location/`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        const locationData = response.data
        const system = systemsMap.get(locationData.solar_system_id)

        if (!system) {
            res.status(404).json({ message: 'System not found' })
            return
        }

        res.status(200).json({
            systemId: system.solarSystemId,
            systemName: system.solarSystemName,
            security: system.security
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                res.status(401).json({ message: 'Invalid or expired token' })
                return
            }
        }
        console.error('Error fetching character location:', error)
        res.status(500).json({ message: 'Error fetching character location' })
    }
}
