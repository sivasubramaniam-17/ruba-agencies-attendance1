"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CheckCircle, XCircle } from "lucide-react"

interface FaceRecognitionProps {
  onRecognitionComplete: (success: boolean, faceData?: string) => void
  isActive: boolean
}

export function FaceRecognition({ onRecognitionComplete, isActive }: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recognitionStatus, setRecognitionStatus] = useState<"idle" | "processing" | "success" | "failed">("idle")

  useEffect(() => {
    if (isActive && !stream) {
      startCamera()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isActive])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      onRecognitionComplete(false)
    }
  }

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setIsCapturing(true)
    setRecognitionStatus("processing")

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (context) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      // Convert to base64 for processing
      const imageData = canvas.toDataURL("image/jpeg", 0.8)

      // Simulate face recognition processing
      setTimeout(() => {
        // In a real implementation, this would call an AI service
        const success = Math.random() > 0.2 // 80% success rate for demo

        setRecognitionStatus(success ? "success" : "failed")
        setIsCapturing(false)

        setTimeout(() => {
          onRecognitionComplete(success, success ? imageData : undefined)
          setRecognitionStatus("idle")
        }, 1500)
      }, 2000)
    }
  }

  if (!isActive) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Face Recognition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg bg-gray-100" />
          <canvas ref={canvasRef} className="hidden" />

          {recognitionStatus === "processing" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Processing...</p>
              </div>
            </div>
          )}

          {recognitionStatus === "success" && (
            <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Recognition Successful!</p>
              </div>
            </div>
          )}

          {recognitionStatus === "failed" && (
            <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <XCircle className="h-12 w-12 mx-auto mb-2" />
                <p>Recognition Failed</p>
              </div>
            </div>
          )}
        </div>

        <Button onClick={captureAndRecognize} disabled={isCapturing || recognitionStatus !== "idle"} className="w-full">
          {isCapturing ? "Processing..." : "Capture & Recognize"}
        </Button>
      </CardContent>
    </Card>
  )
}
