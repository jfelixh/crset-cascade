import {
  constructBFC,
  convertSetToBinary,
  fromDataHexString,
  isInBFC,
  toDataHexString,
} from "../src";

const validTestSet = new Set<string>();
for (let i = 1; i <= 1000; i++) {
  let randomHex = "";
  const hexLength = 64;

  // Generate a 64-character (32-byte) hex value
  for (let i = 0; i < hexLength / 8; i++) {
    // Generate a random 8-character hex segment
    const segment = Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
    randomHex += segment;
  }
  validTestSet.add(randomHex); // Convert each number to a string and add it to the Set
}
const invalidTestSet = new Set<string>();
for (let i = 1000; i <= 3000; i++) {
  const hexLength = 64; // Desired length of each hex value

  let randomHex = "";

  // Generate a 64-character (32-byte) hex value
  for (let i = 0; i < hexLength / 8; i++) {
    // Generate a random 8-character hex segment
    const segment = Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0");
    randomHex += segment;
  }
  invalidTestSet.add(randomHex); // Convert each number to a string and add it to the Set
}
const result = constructBFC(validTestSet, invalidTestSet, 2000);

test("convert set to binary", () => {
  const resultSet = new Set([
    "602b4b2b81f063d07107772b735810e238007d84df71baf9ad37fe58b4daff38",
  ]);
  const binarySet = convertSetToBinary(resultSet);
  expect(binarySet.size).toBe(1);
  expect(binarySet.values().next().value).toBe(
    "0110000000101011010010110010101110000001111100000110001111010000011100010000011101110111001010110111001101011000000100001110001000111000000000000111110110000100110111110111000110111010111110011010110100110111111111100101100010110100110110101111111100111000",
  );
});

test("if first layer of bloom filter is implemented correctly", () => {
  const filter = result[0];
  const firstLayer = filter[0];
  const validTestSetFirst: Set<string> = convertSetToBinary(validTestSet);

  validTestSetFirst.forEach((id) => {
    const cascadeLevel = 1;
    id = id + cascadeLevel.toString(2).padStart(8, "0") + result[1];
    expect(firstLayer?.test(id)).toBe(true);
    // expect(isInBFC(id,result[0],result[1])).toBe(true)
  });
});

test("if second layer of bloom filter is implemented correctly", () => {
  const filter = result[0];
  const firstLayer = filter[0];
  const secondLayer = filter[1];
  const invalidTestSetFirst: Set<string> = convertSetToBinary(invalidTestSet);
  const falsePositives = new Set<string>();
  invalidTestSetFirst.forEach((id) => {
    const cascadeLevel = 1;
    const id_test = id + cascadeLevel.toString(2).padStart(8, "0") + result[1];
    if (firstLayer?.test(id_test)) {
      falsePositives.add(id);
    }
  });
  falsePositives.forEach((id) => {
    const cascadeLevel = 2;
    expect(
      secondLayer?.test(
        id + cascadeLevel.toString(2).padStart(8, "0") + result[1],
      ),
    ).toBe(true);
  });
});

test("enforce rHat minimum depending on input data", () => {
  const validTestSets = new Set<string>();
  for (let i = 1; i <= 1000; i++) {
    let randomHex = "";
    const hexLength = 64;
    // Generate a 64-character (32-byte) hex value
    for (let i = 0; i < hexLength / 8; i++) {
      // Generate a random 8-character hex segment
      const segment = Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
      randomHex += segment;
    }
    validTestSets.add(randomHex);
  }

  const invalidTestSets = new Set<string>();
  for (let i = 1000; i <= 3000; i++) {
    const hexLength = 64;
    let randomHex = "";
    for (let i = 0; i < hexLength / 8; i++) {
      const segment = Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
      randomHex += segment;
    }
    invalidTestSets.add(randomHex);
  }

  expect(() => constructBFC(validTestSets, invalidTestSets, 800)).toThrow(
    RangeError,
  );
});

test("if the valid VC is in the Bloomfilter with the correct implementation of isInBFC()", () => {
  validTestSet.forEach((id) => {
    expect(isInBFC(id, result[0], result[1])).toBe(true);
  });
});

test("if the invalid VC is in the BLoomfilter with the correct implementation of isInBFC()", () => {
  invalidTestSet.forEach((id) => {
    expect(isInBFC(id, result[0], result[1])).toBe(false);
  });
});

test("serialized the Bloomfilter correctly", () => {
  const deserializedResult = fromDataHexString(toDataHexString(result));

  // Test that both filters behave the same way
  validTestSet.forEach((id) => {
    const originalResult = isInBFC(id, result[0], result[1]);
    const deserializedResultValue = isInBFC(
      id,
      deserializedResult[0],
      deserializedResult[1],
    );
    expect(originalResult).toBe(deserializedResultValue);
  });

  invalidTestSet.forEach((id) => {
    const originalResult = isInBFC(id, result[0], result[1]);
    const deserializedResultValue = isInBFC(
      id,
      deserializedResult[0],
      deserializedResult[1],
    );
    expect(originalResult).toBe(deserializedResultValue);
  });

  // Compare salt strings
  expect(result[1]).toStrictEqual(deserializedResult[1]);

  // Compare lengths
  expect(result[0].length).toStrictEqual(deserializedResult[0].length);

  // Compare the actual bit arrays of each filter
  for (let i = 0; i < result[0].length; i++) {
    expect(result[0][i].buckets).toStrictEqual(
      deserializedResult[0][i].buckets,
    );
  }
});

test("see if serialized deserialized Bloomfilter works properly", () => {
  const deserializedResult = fromDataHexString(toDataHexString(result));
  validTestSet.forEach((id) => {
    expect(isInBFC(id, deserializedResult[0], deserializedResult[1])).toBe(
      true,
    );
  });
  for (const id of invalidTestSet) {
    expect(isInBFC(id, deserializedResult[0], deserializedResult[1])).toBe(
      false,
    );
  }
});
