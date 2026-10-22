# RESQNET
Simulation-based resilient multi-agent drone coordination for disaster response

# Computer Vision Module — Disaster Person Detection

## Overview
This module is part of a decentralized drone coordination system designed to support search and rescue operations in disaster-affected areas.

The primary goal is to identify possible people in aerial disaster images and provide structured detection results to help the system prioritize areas for further investigation.

## Key Responsibilities

- **Disaster Image Processing:** Process images associated with earthquake, flood, and cyclone scenarios.
- **Person Detection:** Use computer vision and object detection techniques to identify possible people in aerial images.
- **Bounding Box Generation:** Mark the detected candidates and identify their positions within each image.
- **Confidence Estimation:** Provide confidence scores for each detection.
- **Detection Information:** Generate structured results containing candidate IDs, image IDs, bounding-box coordinates, and confidence scores.
- **Result Visualization:** Display detection results on images for easier inspection and verification.
- **Backend Integration:** Provide detection results to the backend for further processing and coordination.
- **Search Prioritization Support:** Supply candidate locations within images to support decisions about which areas may need further investigation.

## Technology Stack
- Python
- Ultralytics YOLO
- OpenCV
- FastAPI for planned API integration
- JSON for structured detection results

## Role in the Overall System

The intended workflow is:

1. A user selects a location on the frontend map.
2. The corresponding disaster image is retrieved.
3. The computer vision module processes the image.
4. Possible people are identified and marked with bounding boxes.
5. Detection results, including confidence scores and image coordinates, are returned to the system.
6. The coordination system uses the results to support search prioritization across the disaster-affected area.

## Expected Output

The module is intended to provide:

- Annotated disaster images.
- Person detection bounding boxes.
- Confidence scores.
- Candidate identifiers and image identifiers.
- Image-coordinate information.
- Structured results for backend integration.

## Scope and Limitations

The module is intended to support disaster-response decision-making by identifying possible people in images. Detection results are candidates, not confirmed survivors. Small, distant, or partially obscured people may be missed, and false detections may occur.

Geographic coordinates and drone identifiers must be supplied by the relevant system components when available. Human verification is required before treating a detection as a confirmed person in need of rescue.

## Project Goal

To develop a computer vision component that connects image-based person detection with a decentralized drone coordination system, helping support efficient search prioritization in disaster-affected areas.
