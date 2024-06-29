import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  HStack,
} from '@chakra-ui/react';
import { gapi } from 'gapi-script';

const CLIENT_ID = '961171182933-qvm6ko3ahn46bi8hbdhin3r45el7t2ii.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1x2eQgJuzrl5Gmatw0eJM30vhUtibLn_p'; // Reemplaza con tu carpeta
const AUDIO_SRC = './marcha-nupcial.mp3'; // Reemplaza con la ruta a tu archivo de audio

function App() {
  const fileInputRef = useRef();
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: SCOPES,
      }).then(() => {
        gapi.auth2.getAuthInstance().signIn().catch(error => {
          console.error('Error signing in', error);
        });
      });
    };

    gapi.load('client:auth2', initClient);
  }, []);

  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn().catch(error => {
      console.error('Error signing in', error);
    });
  };

  const handleFileUpload = () => {
    const files = fileInputRef.current.files;
    if (files.length > 0) {
      const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

      Array.from(files).forEach(file => {
        const metadata = {
          name: file.name,
          mimeType: file.type,
          parents: [FOLDER_ID],
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
          body: form,
        })
          .then((response) => response.json())
          .then((data) => {
            console.log(data);
            alert('Archivo subido con éxito');
            fetchFiles(); // Actualiza la lista de archivos después de subir uno nuevo
          })
          .catch((error) => {
            console.error('Error uploading file', error);
            alert('Error al subir el archivo');
          });
      });
    }
  };

  const fetchFiles = () => {
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    gapi.client.drive.files.list({
      q: `'${FOLDER_ID}' in parents`,
      fields: 'files(id, name, mimeType)',
    }).then(async (response) => {
      const files = response.result.files;
      const fileBlobs = await Promise.all(files.map(async (file) => {
        const blob = await fetchFileBlob(file.id, accessToken);
        return { ...file, blobUrl: URL.createObjectURL(blob) };
      }));
      setFiles(fileBlobs);
    }).catch((error) => {
      console.error('Error fetching files', error);
      alert('Error al obtener los archivos');
    });
  };

  const fetchFileBlob = async (fileId, accessToken) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    });
    return response.blob();
  };

  const handleImageClick = (blobUrl) => {
    setSelectedImage(blobUrl);
    onOpen();
  };

  return (
    <Container centerContent>
      <HStack border="3px solid blue" w="100%" h="30px">
      <audio border="3px solid blue" src={AUDIO_SRC} autoPlay loop />
      </HStack>
      <Box padding="4" bg="gray.100" maxW="3xl" borderRadius="md">
        <Tabs isFitted variant="enclosed">
          <TabList mb="1em">
            <Tab>Subir Fotos</Tab>
            <Tab onClick={fetchFiles}>Ver Fotos</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <VStack spacing={4}>
                <Heading as="h1" size="xl">Sube tus Fotos de la Boda</Heading>
                <Input type="file" ref={fileInputRef} multiple />
                <Button colorScheme="blue" onClick={handleAuthClick}>Iniciar Sesión en Google</Button>
                <Button colorScheme="blue" onClick={handleFileUpload}>Subir</Button>
              </VStack>
            </TabPanel>
            <TabPanel>
              <SimpleGrid columns={[1, null, 3]} spacing="40px">
                {files.map(file => (
                  <Box key={file.id} maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden">
                    <Image src={file.blobUrl} alt={file.name} onClick={() => handleImageClick(file.blobUrl)} cursor="pointer" />
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Imagen</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedImage && <Image src={selectedImage} alt="Selected" />}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default App;
