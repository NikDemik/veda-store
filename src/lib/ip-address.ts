import { createHmac } from 'node:crypto';

function normalizeIpv4(value: string) {
    const parts = value.split('.');
    if (parts.length !== 4) return null;

    const normalized = parts.map((part) => {
        if (!/^\d{1,3}$/.test(part)) return null;
        const number = Number(part);
        return number <= 255 ? String(number) : null;
    });

    return normalized.some((part) => part === null) ? null : normalized.join('.');
}

function normalizeIpv6(value: string) {
    let address = value.toLowerCase();
    const zoneIndex = address.indexOf('%');
    if (zoneIndex !== -1) address = address.slice(0, zoneIndex);

    const ipv4TailMatch = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (ipv4TailMatch) {
        const ipv4 = normalizeIpv4(ipv4TailMatch[1]);
        if (!ipv4) return null;

        const octets = ipv4.split('.').map(Number);
        const firstGroup = ((octets[0] << 8) | octets[1]).toString(16);
        const secondGroup = ((octets[2] << 8) | octets[3]).toString(16);
        address = `${address.slice(0, -ipv4TailMatch[1].length)}${firstGroup}:${secondGroup}`;
    }

    if ((address.match(/::/g) ?? []).length > 1) return null;

    const [leftPart, rightPart] = address.split('::');
    const left = leftPart ? leftPart.split(':') : [];
    const right = rightPart ? rightPart.split(':') : [];
    const isCompressed = address.includes('::');

    if ([...left, ...right].some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
    if ((!isCompressed && left.length !== 8) || (isCompressed && left.length + right.length >= 8)) {
        return null;
    }

    const missingGroups = isCompressed ? 8 - left.length - right.length : 0;
    const groups = [
        ...left,
        ...Array.from({ length: missingGroups }, () => '0'),
        ...right,
    ].map((group) => Number.parseInt(group, 16));

    if (groups.length !== 8 || groups.some((group) => Number.isNaN(group))) return null;

    const isMappedIpv4 =
        groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
    if (isMappedIpv4) {
        return [
            groups[6] >> 8,
            groups[6] & 0xff,
            groups[7] >> 8,
            groups[7] & 0xff,
        ].join('.');
    }

    return groups.map((group) => group.toString(16).padStart(4, '0')).join(':');
}

export function normalizeIpAddress(value: string) {
    let address = value.trim();

    const bracketMatch = address.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketMatch) {
        address = bracketMatch[1];
    } else {
        const ipv4WithPort = address.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
        if (ipv4WithPort) address = ipv4WithPort[1];
    }

    return normalizeIpv4(address) ?? normalizeIpv6(address);
}

export function hashIpAddress(ip: string, secret: string) {
    return createHmac('sha256', secret).update(ip).digest('hex');
}

