import { Plus, Minus, Maximize, RefreshCw } from 'lucide-react';
import { Button } from '../UI/Button';

export const ZoomControls = ({ onZoomIn, onZoomOut, onFit }) => {
    return (
        <div className="absolute bottom-6 left-6 z-50 flex flex-col space-y-2">
            <Button
                variant="secondary"
                className="rounded-full w-10 h-10 p-0 shadow-lg"
                onClick={onZoomIn}
                title="Zoom In"
            >
                <Plus className="h-6 w-6" />
            </Button>
            <Button
                variant="secondary"
                className="rounded-full w-10 h-10 p-0 shadow-lg"
                onClick={onZoomOut}
                title="Zoom Out"
            >
                <Minus className="h-6 w-6" />
            </Button>
            <Button
                variant="secondary"
                className="rounded-full w-10 h-10 p-0 shadow-lg"
                onClick={onFit}
                title="Fit to Screen"
            >
                <Maximize className="h-5 w-5" />
            </Button>
        </div>
    );
};
