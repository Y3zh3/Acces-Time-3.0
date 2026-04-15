// Type definitions for face-api.js
// face-api.js no tiene tipos oficiales completos, así que agregamos declaraciones básicas

declare module 'face-api.js' {
  export interface FaceDetection {
    box: { x: number; y: number; width: number; height: number };
    score: number;
  }

  export interface FaceLandmarks68 {
    positions: Point[];
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface FaceDescriptor extends Float32Array {}

  export interface WithFaceDetection<T> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<T> extends WithFaceDetection<T> {
    landmarks: FaceLandmarks68;
  }

  export interface WithFaceDescriptor<T> extends WithFaceLandmarks<T> {
    descriptor: Float32Array;
  }

  export const nets: {
    ssdMobilenetv1: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri(uri: string): Promise<void>;
    };
  };

  export function detectSingleFace(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): {
    withFaceLandmarks(): {
      withFaceDescriptor(): Promise<WithFaceDescriptor<{}> | undefined>;
    };
  };

  export function euclideanDistance(arr1: Float32Array, arr2: Float32Array): number;
}
