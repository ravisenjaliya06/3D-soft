import logo from '@/assets/titleLogo.svg';
import { useAuthRedirect } from '@/components/helper/helper';
import Material from '@/components/material';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';
import CatalogManager from '@/components/catalogmanager';

const MaterialPage = () => {
    useEffect(() => {
        document.title = PAGE_TITLE.CATALOG_MANAGER;
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = logo.src;
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, []);

    const { isLoading } = useAuthRedirect();

    if (isLoading) {
        return null;
    }
    return <CatalogManager />;
};

export default MaterialPage;
