import { expect, test } from 'vitest';
import {
  generateNetmask,
  getPrefixLength,
  parseIPv4Address,
  parseIPv4Packet,
  serializeIPv4Address,
  serializeIPv4Cidr,
  serializeIPv4Packet,
  type IPv4Packet,
} from './ipv4.js';

test('parses an IPv4 address string into a Uint8Array', () => {
  expect(serializeIPv4Address('192.168.1.1')).toEqual(
    Uint8Array.from([192, 168, 1, 1])
  );
  expect(serializeIPv4Address('10.0.0.1')).toEqual(
    Uint8Array.from([10, 0, 0, 1])
  );
  expect(serializeIPv4Address('255.255.255.255')).toEqual(
    Uint8Array.from([255, 255, 255, 255])
  );
  expect(serializeIPv4Address('0.0.0.0')).toEqual(
    Uint8Array.from([0, 0, 0, 0])
  );
});

test('throws an error for invalid IPv4 address strings', () => {
  expect(() => serializeIPv4Address('192.168.1')).toThrow();
  expect(() => serializeIPv4Address('192.168.1.')).toThrow();
  expect(() => serializeIPv4Address('192.168.1.256')).toThrow();
  expect(() => serializeIPv4Address('hello')).toThrow();
});

test('serializes a cidr notation string', () => {
  expect(serializeIPv4Cidr('192.168.1.1/24')).toEqual({
    ipAddress: Uint8Array.from([192, 168, 1, 1]),
    netmask: Uint8Array.from([255, 255, 255, 0]),
  });
});

test('generates a netmask from a mask size', () => {
  expect(generateNetmask(24)).toEqual(Uint8Array.from([255, 255, 255, 0]));
  expect(generateNetmask(16)).toEqual(Uint8Array.from([255, 255, 0, 0]));
  expect(generateNetmask(8)).toEqual(Uint8Array.from([255, 0, 0, 0]));
});

test('throws an error for invalid mask sizes', () => {
  expect(() => generateNetmask(33)).toThrow();
});

test('parses a Uint8Array into an IPv4 address string', () => {
  expect(parseIPv4Address(Uint8Array.from([192, 168, 1, 1]))).toBe(
    '192.168.1.1'
  );
  expect(parseIPv4Address(Uint8Array.from([10, 0, 0, 1]))).toBe('10.0.0.1');
  expect(parseIPv4Address(Uint8Array.from([255, 255, 255, 255]))).toBe(
    '255.255.255.255'
  );
  expect(parseIPv4Address(Uint8Array.from([0, 0, 0, 0]))).toBe('0.0.0.0');
});

test('throws an error for invalid IPv4 address Uint8Arrays', () => {
  expect(() => parseIPv4Address(Uint8Array.from([192, 168, 1]))).toThrow();
  expect(
    () => parseIPv4Address(Uint8Array.from([104, 101, 108, 108, 111])) // 'hello'
  ).toThrow();
});

test('parses an IPv4 packet containing a UDP datagram', () => {
  const packet = new Uint8Array([
    0x45, // version, IHL
    0x00, // DSCP, ECN
    0x00,
    0x20, // total length: 32
    0x00,
    0x00, // identification
    0x00,
    0x00, // flags, fragment offset
    0x40, // TTL: 64
    0x11, // protocol: UDP
    0xf7,
    0x79, // checksum: 0xf779
    0xc0,
    0xa8,
    0x01,
    0x01, // source IP: 192.168.1.1
    0xc0,
    0xa8,
    0x01,
    0x02, // destination IP: 192.168.1.2
    0x00,
    0x08, // source port: 8
    0x00,
    0x07, // destination port: 7
    0x00,
    0x0c, // length: 12
    0x78,
    0x6d, // checksum: 0x786d
    0x01,
    0x02,
    0x03,
    0x04, // payload
  ]);

  const result = parseIPv4Packet(packet);

  expect(result).toEqual({
    version: 4,
    dscp: 0,
    ecn: 0,
    identification: 0,
    flags: 0,
    fragmentOffset: 0,
    ttl: 64,
    protocol: 'udp',
    sourceIP: '192.168.1.1',
    destinationIP: '192.168.1.2',
    payload: {
      sourcePort: 8,
      destinationPort: 7,
      payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
    },
  });
});

test('serializes an IPv4 packet containing a UDP datagram', () => {
  const packet: IPv4Packet = {
    version: 4,
    dscp: 0,
    ecn: 0,
    identification: 0,
    flags: 0,
    fragmentOffset: 0,
    ttl: 64,
    protocol: 'udp',
    sourceIP: '192.168.1.1',
    destinationIP: '192.168.1.2',
    payload: {
      sourcePort: 8,
      destinationPort: 7,
      payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
    },
  };

  const result = serializeIPv4Packet(packet);

  expect(result).toEqual(
    new Uint8Array([
      0x45, // version, IHL
      0x00, // DSCP, ECN
      0x00,
      0x20, // total length: 32
      0x00,
      0x00, // identification
      0x00,
      0x00, // flags, fragment offset
      0x40, // TTL: 64
      0x11, // protocol: UDP
      0xf7,
      0x79, // checksum: 0xf779
      0xc0,
      0xa8,
      0x01,
      0x01, // source IP: 192.168.1.1
      0xc0,
      0xa8,
      0x01,
      0x02, // destination IP: 192.168.1.2
      0x00,
      0x08, // source port: 8
      0x00,
      0x07, // destination port: 7
      0x00,
      0x0c, // length: 12
      0x78,
      0x6d, // checksum: 0x786d
      0x01,
      0x02,
      0x03,
      0x04, // payload
    ])
  );
});

test('gets standard prefix lengths from netmask', () => {
  expect(getPrefixLength(Uint8Array.from([0, 0, 0, 0]))).toBe(0);
  expect(getPrefixLength(Uint8Array.from([255, 0, 0, 0]))).toBe(8);
  expect(getPrefixLength(Uint8Array.from([255, 255, 0, 0]))).toBe(16);
  expect(getPrefixLength(Uint8Array.from([255, 255, 255, 0]))).toBe(24);
  expect(getPrefixLength(Uint8Array.from([255, 255, 255, 255]))).toBe(32);
});

test('gets non-standard prefix length from netmask', () => {
  expect(getPrefixLength(Uint8Array.from([128, 0, 0, 0]))).toBe(1);
  expect(getPrefixLength(Uint8Array.from([254, 0, 0, 0]))).toBe(7);
  expect(getPrefixLength(Uint8Array.from([255, 248, 0, 0]))).toBe(13);
  expect(getPrefixLength(Uint8Array.from([255, 255, 224, 0]))).toBe(19);
  expect(getPrefixLength(Uint8Array.from([255, 255, 255, 128]))).toBe(25);
  expect(getPrefixLength(Uint8Array.from([255, 255, 255, 252]))).toBe(30);
});

test('throws error for invalid netmask with non-contiguous bits', () => {
  expect(() => getPrefixLength(Uint8Array.from([255, 0, 255, 0]))).toThrow(
    'invalid netmask: non-contiguous bits'
  );
  expect(() => getPrefixLength(Uint8Array.from([255, 254, 0, 1]))).toThrow(
    'invalid netmask: non-contiguous bits'
  );
  expect(() => getPrefixLength(Uint8Array.from([255, 255, 254, 255]))).toThrow(
    'invalid netmask: non-contiguous bits'
  );
});
