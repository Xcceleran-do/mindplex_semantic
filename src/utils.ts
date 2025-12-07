export function toNames(input: any) {
    if (!input) return '';

    return Array.isArray(input)
        ? input.map(item => item?.name ?? item).join(',')
        : input.name ?? input;
}