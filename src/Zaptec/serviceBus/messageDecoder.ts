export function messageDecoder(msg: Uint8Array): any[] {
    function* dataProducer(data: Uint8Array): Generator<Uint8Array | void> {
        let count: any = 0; // Explicitly declare count as a number
        while (data.length > 0) {
            const block = data.slice(0, count);
            data = data.slice(count);
            count = yield block; // count is set based on the yield from outside
        }
    }

    const prod = dataProducer(msg);
    prod.next(); // Initialize the generator

    // Record type constants
    const END_ELEMENT = 0x01;
    const SHORT_XMLNS_ATTRIBUTE = 0x08;
    const SHORT_ELEMENT = 0x40;
    const CHARS8TEXT = 0x98;
    const CHARS16TEXT = 0x9A;

    function readString(bits16 = false): string {
        let length: number;
        const b = bits16 ? prod.next(2).value : prod.next(1).value; // Check for undefined here
        if (!b || b.length < (bits16 ? 2 : 1)) throw new Error("Unexpected end of data while reading string length.");
        
        length = bits16 ? (b[0] as number) + ((b[1] as number) << 8) : b[0] as number; // Ensure b[0] and b[1] are numbers
        const strBytes = prod.next(length).value; // Check for undefined here
        if (!strBytes) throw new Error("Unexpected end of data while reading string.");
        
        return new TextDecoder("utf-8").decode(strBytes);
    }

    function* frameDecoder(): Generator<[number, string | null]> {
        while (true) {
            const result = prod.next(1).value; // Ensure this is defined
            if (result === undefined) return; // Exit if no record type is available
            const recordType = (result[0] as number); // Now we know result is defined

            if ([SHORT_ELEMENT, SHORT_XMLNS_ATTRIBUTE, CHARS8TEXT, CHARS16TEXT].includes(recordType)) {
                yield [recordType, readString(recordType === CHARS16TEXT)];
            } else if (recordType === END_ELEMENT) {
                yield [recordType, null];
            } else {
                throw new Error(`Unknown record type ${recordType.toString(16)}`);
            }
        }
    }

    const root: any[] = [];
    const frame = frameDecoder();

    while (true) {
        const result = frame.next(); // Use result to check if we have a value
        if (result.done) break; // Exit if no record is available
        const [recordType, text] = result.value; // Destructure here
        if (recordType === undefined) break; // Exit if no record is available

        // Build the composite object
        if (recordType === SHORT_ELEMENT) {
            const element: { name: string; xmlns?: string; text?: string } = { name: text || "" };
            root.push(element);

            while (true) {
                const frameResult = frame.next(); // Use result to check if we have a value
                if (frameResult.done) break; // Exit if no record is available

                const [recordType, text] = frameResult.value; // Destructure here
                if (recordType === SHORT_XMLNS_ATTRIBUTE) {
                    element.xmlns = text || "";
                } else if ([CHARS8TEXT, CHARS16TEXT].includes(recordType)) {
                    element.text = text || "";
                } else if (recordType === END_ELEMENT) {
                    break;
                } else {
                    throw new Error(`Unknown record type ${recordType.toString(16)}`);
                }
            }
        } else {
            throw new Error(`Unknown record type ${recordType.toString(16)}`);
        }
    }

    return root; // Ensure the root array is returned
}