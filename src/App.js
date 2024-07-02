import React, { useEffect, useRef, useState } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import { DeleteIcon } from '@chakra-ui/icons';
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
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  DrawerCloseButton,
  useDisclosure,
  SimpleGrid,
  Text,
  useToast,
} from '@chakra-ui/react';
import { gapi } from 'gapi-script';
import "react-responsive-carousel/lib/styles/carousel.min.css"; 
import { Carousel } from 'react-responsive-carousel';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';

const CLIENT_ID = '961171182933-qvm6ko3ahn46bi8hbdhin3r45el7t2ii.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1SqKQVyN-Qv9Sftp2OXOIVe9j_oEdRdwT';
const API_KEY = 'AIzaSyCaJtdq24hXZuslhZ9R3BCPySNjmetk130'


function App() {
  const fileInputRef = useRef();
  const [files, setFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(0);
  const toast = useToast()
  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: SCOPES,
      }).then(() => {
        const authInstance = gapi.auth2.getAuthInstance();
        authInstance.isSignedIn.listen(updateSignInStatus);
        updateSignInStatus(authInstance.isSignedIn.get());
      });
    };

    gapi.load('client:auth2', initClient);
  }, []);

  const updateSignInStatus = (isSignedIn) => {
    setIsSignedIn(isSignedIn);
    if (isSignedIn) {
      const user = gapi.auth2.getAuthInstance().currentUser.get();
      setUserProfile(user.getBasicProfile());
      fetchFiles();
    } else {
      setUserProfile(null);
    }
  };

  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn().catch(error => {
      console.error('Error signing in', error);
    });
  };

  const handleSignOutClick = () => {
    gapi.auth2.getAuthInstance().signOut().then(() => {
      setIsSignedIn(false);
      setUserProfile(null);
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
            toast("Subida")
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
      const files = response.result.files || [];
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

  const handleFileDelete = (fileId) => {
    const accessToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    })
      .then(() => {
        toast('Archivo eliminado con éxito');
        fetchFiles(); // Actualiza la lista de archivos después de eliminar uno
      })
      .catch((error) => {
        console.error('Error deleting file', error);
        alert('Error al eliminar el archivo');
      });
  };



  return (
    <Container 
    position={"center"} 
    centerContent   
    padding="4"
    w={{ base: "full", md: "3xl" }}  
    h={{ base:"full",md: "100%"}}
    minH="100vh"
    borderRadius="md"
    backgroundImage="https://i.ibb.co/gzLMG5X/rym.jpg" 
    backgroundSize= {{base :"contain", md: "contain"}}
    backgroundRepeat={'no-repeat'}
       
  >
      
      <Box
        padding="4"
        bg="rgba(255, 255, 255, .7) "
        borderRadius="md"
        mt="100px"
        h="100%"
        w="auto"
        backgroundImage="url('rym.jpg')" 
      >
        {!isSignedIn ? (
          <VStack spacing={4}>
            <Heading as="h1" size="xl">Inicia sesión para subir y ver fotos</Heading>
            <Button colorScheme="blue" onClick={handleAuthClick}>Iniciar Sesión en Google</Button>
          </VStack>
        ) : (
          <>
            <VStack spacing={4}>
              <Heading as="h1" size="xl">Sube tus Fotos de la Boda</Heading>
              {userProfile && (
                <Text>Conectado como: {userProfile.getName()} ({userProfile.getEmail()})</Text>
              )}
              <Input type="file" ref={fileInputRef} multiple />
              <Button colorScheme="blue" onClick={handleFileUpload}>Subir</Button>
              <Button colorScheme="red" onClick={handleSignOutClick}>Cerrar Sesión</Button>
            </VStack>
            <Tabs isFitted variant="enclosed" mt={4}>
              <TabList mb="1em">
                <Tab onClick={fetchFiles}>Ver Fotos</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                <SimpleGrid columns={[1, null, 3]} spacing="40px" mt={4}>
                    {files.map(file => (
                      <Box border="1px solid black" w="100px" h="100px" key={file.id} position="relative" overflow="hidden" alignContent={"center"}>
                        <Image src={file.blobUrl} alt={file.name} onClick={() => handleImageClick(file.blobUrl)} cursor="pointer" />
                        <IconButton
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          onClick={() => handleFileDelete(file.id)}
                          position="absolute"
                          top="10px"
                          right="10px"
                          zIndex="2"
                          opacity="0"
                          _hover={{ opacity: 1 }}
                          transition="opacity 0.2s"
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent
          display="flex"
          justifyContent="center"
          alignItems="center"
          bg="rgba(0, 0, 0, .7) "
          boxShadow="none"
          animation="scaleUp 0.3s ease-in-out"
        >
          <ModalCloseButton color="white" bg="black"/>
          <ModalBody display="flex" justifyContent="center" alignItems="center">
            {selectedImage && (
              <Image src={selectedImage} alt="Selected" maxW="100vw" maxH="100vh" />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

    </Container>
  );
}

export default App;
