import React from 'react';
import { styled } from '@material-ui/core/styles';

const Container = styled('div')(({ theme }) => {

  return {
    position: 'relative',
    height: '100%',
    width: '50%',
    display: 'grid',
  };
});

export default function Map() {
  return (
    <Container />
  );
}
