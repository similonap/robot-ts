import { Item } from "circuit-crawler";
import { useEffect, useState } from "react";
import { analyzeImageContent, BoundingBox } from "@/lib/imageUtils";
import { motion } from "framer-motion";

interface MazeItemDisplayProps {
    item: Item;
    cellSize: number;
    showAnimations?: boolean;
}

export default function MazeItemDisplay({ item, cellSize, showAnimations = true }: MazeItemDisplayProps) {
    const [bbox, setBbox] = useState<BoundingBox | null>(null);

    useEffect(() => {
        if (item.imageUrl) {
            analyzeImageContent(item.imageUrl).then(setBbox);
        } else {
            setBbox(null);
        }
    }, [item.imageUrl]);

    const renderContent = () => {
        if (item.imageUrl) {
            // Default 100% fit if no bbox yet
            let x = -cellSize * 0.4;
            let y = -cellSize * 0.4;
            let width = cellSize * 0.8;
            let height = cellSize * 0.8;
            let scale = 1;

            if (bbox) {
                // Determine scale to fit the bbox into the cell
                // We want to map the bbox width/height to the full cell size (reduced by margin)
                const targetSize = cellSize * 0.8; // Use 80% to leave a bit of margin

                // Effective width/height of the content in standard units
                // bbox values are 0..1 relative to original image size
                // We treat the original image as fitting into a 1x1 unit square initially

                // We want (bbox.width * scaleFactor) = targetSize_relative_to_1
                // So scaleFactor = targetSize / bbox.width

                // Or simpler: We are rendering into a square of size `targetSize`.
                // We want to transform the image such that the bbox centers and fills that square.

                const contentScale = 1 / Math.max(bbox.width, bbox.height);

                // Adjust scale by user preference
                scale = scale * contentScale;

                // Center the bbox
                // The center of the bbox is at (bbox.x + bbox.width/2, bbox.y + bbox.height/2)
                // We want this point to be at (0,0) in our local coord system
                // So we translate by negative of that.

                // However, <image> x/y are top-left corners.
                // If we assume a base size of 1x1, we translate to center 0.5,0.5 to 0,0

                // Let's rely on standard centering and just apply scale to the dimensions
                // If we just scale the width/height, we also magnify the offset.

                // Re-think:
                // We render the image at full size relative to cell (cellSize).
                // ViewBox? No, we are in SVG.
                // We can use a transform on the <image> or its parent.

                // Let's calculate the `x, y, width, height` such that the bounding box fills the area.

                // The visual width of the image will be: (cellSize * 0.8) * scale
                width = cellSize * 0.8 * scale;
                height = cellSize * 0.8 * scale;

                // To center based on bbox:
                // We want the center of the visible area (0,0) to align with the center of the bounding box.
                // The center of the bounding box relative to the image's top-left (0,0) is:
                // cx = bbox.x + bbox.width/2 (0..1 range)
                // cy = bbox.y + bbox.height/2

                // If the top-left of the image is at (ix, iy), then the center is at (ix + width*cx, iy + height*cy).
                // We want this to be at (0,0).
                // ix + width*cx = 0  =>  ix = -width * cx
                // iy + height*cy = 0  =>  iy = -height * cy

                // However, width/height here are the *rendered* dimensions of the full image.
                // Since `width` variable above is already scaled by contentScale (which bloats it to fit bbox),
                // `width` represents the size of the *full* image if it were rendered.

                const cx = bbox.x + bbox.width / 2;
                const cy = bbox.y + bbox.height / 2;

                x = -width * cx;
                y = -height * cy;
            } else {
                // Standard centering for non-analyzed image
                x = -width / 2;
                y = -height / 2;
            }

            return (
                <image
                    href={item.imageUrl}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                // preserveAspectRatio="none" // We calculated exact dims
                />
            );
        } else {
            return (
                <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={cellSize * 0.6}
                    style={{ userSelect: 'none' }}
                >
                    {item.icon}
                </text>
            );
        }
    };

    if (showAnimations) {
        return (
            <motion.g
                initial={{ scale: 0, opacity: 0, x: item.position.x * cellSize + cellSize / 2, y: item.position.y * cellSize + cellSize / 2 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: "backOut" }}
            >

                {renderContent()}
            </motion.g>
        );
    } else {
        return (
            <g transform={`translate(${item.position.x * cellSize + cellSize / 2}, ${item.position.y * cellSize + cellSize / 2})`}>
                {renderContent()}
            </g>
        );
    }
}
